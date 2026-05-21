// =====================================================
// NSMT Public Critique Form + Discord Integration
// =====================================================
//
// One-time setup (run these from the Apps Script editor):
//   1. createCritiqueForm()        - Generates the actual Google Form. RUN ONCE.
//   2. Set SHARED_SECRET in Project Settings → Script Properties.
//   3. setupCritiqueTrigger()      - Wires the form-submit trigger. RUN ONCE.
//   4. pingDiscord()               - Verify the worker + #submissions webhook works.
//   5. testCritiqueNotification()  - Replay the latest real submission as a full embed.
//
// Automatic:
//   notifyDiscordOnSubmit(e)       - Fires on every new form submission.
//
// Backfill:
//   backfillAllSubmissions()       - One-shot replay of every form response.
//                                    Use when catching up post-trigger or after fixes.
// =====================================================

const FORM_CONFIG = {
  title: 'NSMT Critique — Submit Your Work',
  description: [
    'Share your photo, video, design, or writing work and we will review it.',
    '',
    'NSMT does live (and recorded) critique sessions to help creators sharpen their craft.',
    'Submissions are reviewed by our team. If we feature your work publicly, we will credit you.',
    '',
    'Takes about 3 minutes. Follow @the_nsmt on Instagram for review schedule.',
  ].join('\n'),
  responseSpreadsheetName: 'NSMT Critique Submissions',
  confirmationMessage:
    'Thanks for submitting! Our team reviews submissions on a rolling basis. Follow @the_nsmt on Instagram for the next live review schedule.',
};

/**
 * Read the form ID. createCritiqueForm() stores it in Script Properties so
 * we never have to hard-code it in source. Throws a helpful error if the
 * property is missing.
 */
function getFormId() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!id) {
    throw new Error('FORM_ID missing from Script Properties. Run createCritiqueForm() first — it saves the ID automatically.');
  }
  return id;
}

// Cloudflare Worker proxy URL (same as nsmt-form). SHARED_SECRET lives in
// Script Properties; the worker routes to the critique webhook because we
// send X-NSMT-Target: CRITIQUE.
const PROXY_URL = 'https://nsmt-discord-proxy.old-glitter-7307.workers.dev';
const PROXY_TARGET = 'CRITIQUE';

const NSMT_BLUE = 0x0E80FC;


// =====================================================
// FORM CREATION (run once)
// =====================================================

function createCritiqueForm() {
  const form = FormApp.create(FORM_CONFIG.title)
    .setDescription(FORM_CONFIG.description)
    .setCollectEmail(true)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setConfirmationMessage(FORM_CONFIG.confirmationMessage);

  addAboutYouSection(form);
  addYourWorkSection(form);
  addFeedbackSection(form);

  const ss = SpreadsheetApp.create(FORM_CONFIG.responseSpreadsheetName);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  PropertiesService.getScriptProperties().setProperty('FORM_ID', form.getId());

  Logger.log('Form (public): ' + form.getPublishedUrl());
  Logger.log('Form (edit):   ' + form.getEditUrl());
  Logger.log('Sheet:         ' + ss.getUrl());
  Logger.log('');
  Logger.log('✓ FORM_ID saved to Script Properties. You can now run setupCritiqueTrigger().');
}


// =====================================================
// FORM SECTIONS
// =====================================================

function addAboutYouSection(form) {
  form.addPageBreakItem()
    .setTitle('About You')
    .setHelpText('So we can credit and contact you.');

  form.addTextItem().setTitle('Full Name').setRequired(true);

  form.addTextItem()
    .setTitle('Instagram handle')
    .setHelpText('Optional — for credit if we feature your work.')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Other social or portfolio link')
    .setHelpText('Optional — website, YouTube channel, Behance, etc.')
    .setRequired(false);
}

function addYourWorkSection(form) {
  form.addPageBreakItem()
    .setTitle('Your Work')
    .setHelpText('Tell us what you are submitting.');

  form.addCheckboxItem()
    .setTitle('What are you submitting?')
    .setHelpText('Check all that apply if your submission combines mediums.')
    .setChoiceValues(['Photo', 'Video', 'Graphic Design', 'Writing'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Title of the piece')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('One-line description')
    .setHelpText('What is it? Game/event/subject if relevant.')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Link to your work')
    .setHelpText('Google Drive, YouTube, Vimeo, Behance, blog post, portfolio — anywhere shareable. Make sure the link is publicly viewable.')
    .setRequired(true);
}

function addFeedbackSection(form) {
  form.addPageBreakItem()
    .setTitle('The Review')
    .setHelpText('Help us give you the most useful feedback.');

  form.addParagraphTextItem()
    .setTitle('What kind of feedback are you looking for?')
    .setHelpText('Composition, story, technical, gut reactions, audience impact, anything specific you are unsure about.')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Anything we should know before reviewing?')
    .setHelpText('Optional — context, constraints, what you were going for, deadline you were under, etc.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Are we allowed to feature your work in a public review?')
    .setHelpText('Yes = we can share in a live or recorded review with full credit. No = internal review only.')
    .setChoiceValues(['Yes', 'No', 'Ask me first'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('How did you hear about NSMT?')
    .setRequired(false);
}


// =====================================================
// DISCORD INTEGRATION
// =====================================================

/**
 * Wire the form-submit trigger. Safe to re-run; removes old triggers first.
 */
function setupCritiqueTrigger() {
  const form = FormApp.openById(getFormId());

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'notifyDiscordOnSubmit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('notifyDiscordOnSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('✓ Trigger installed. New submissions will post to #submissions.');
}

/**
 * Quick worker + webhook check. Creates a small test thread in #submissions.
 */
function pingDiscord() {
  const payload = {
    thread_name: '🟢 Critique webhook test',
    content: 'Connection test from NSMT Critique Apps Script. Safe to delete this thread.',
  };

  const response = postToDiscord(payload);
  if (response) {
    Logger.log('Status: ' + response.getResponseCode());
    Logger.log('Body:   ' + response.getContentText());
  }
}

/**
 * Replay the latest real submission as a full embed. Useful for iterating
 * on embed design without faking submissions.
 */
function testCritiqueNotification() {
  const form = FormApp.openById(getFormId());
  const responses = form.getResponses();
  if (responses.length === 0) {
    throw new Error('No form responses yet to test with. Submit one first.');
  }
  const latest = responses[responses.length - 1];
  notifyDiscordOnSubmit({ response: latest });
}

/**
 * One-time backfill: replay every form response through the notifier.
 * WARNING: running this twice creates duplicate threads.
 */
function backfillAllSubmissions() {
  const form = FormApp.openById(getFormId());
  const responses = form.getResponses();
  if (responses.length === 0) {
    Logger.log('No form responses to backfill.');
    return;
  }

  Logger.log('Backfilling ' + responses.length + ' submission(s)...');

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < responses.length; i++) {
    try {
      notifyDiscordOnSubmit({ response: responses[i] });
      succeeded++;
      Logger.log('  (' + (i + 1) + '/' + responses.length + ') ✓');
    } catch (err) {
      failed++;
      Logger.log('  (' + (i + 1) + '/' + responses.length + ') ✗ ' + err.message);
    }
    if (i < responses.length - 1) {
      Utilities.sleep(500);
    }
  }

  Logger.log('Backfill complete: ' + succeeded + ' succeeded, ' + failed + ' failed.');
}

/**
 * Fires automatically on every new form submission.
 */
function notifyDiscordOnSubmit(e) {
  try {
    const r = parseResponses(e.response);
    const name = r['Full Name'] || 'Anonymous Submitter';
    const title = r['Title of the piece'] || 'Untitled';
    const mediums = asArray(r['What are you submitting?']);

    const payload = {
      thread_name: buildCritiqueThreadName(title, mediums, name),
      embeds: [buildCritiqueEmbed(r, name, title, mediums)],
    };

    postToDiscord(payload);
  } catch (err) {
    Logger.log('Error in notifyDiscordOnSubmit: ' + err.message);
    Logger.log(err.stack);
  }
}

function postToDiscord(payload, maxRetries) {
  maxRetries = maxRetries || 3;

  const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!secret) {
    Logger.log('ERROR: SHARED_SECRET missing. Set it in Project Settings → Script Properties.');
    return;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = UrlFetchApp.fetch(PROXY_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: {
        'X-NSMT-Auth': secret,
        'X-NSMT-Target': PROXY_TARGET,
      },
    });

    const code = response.getResponseCode();

    if (code < 300) {
      Logger.log('✓ Discord post succeeded (status ' + code + ')');
      return response;
    }

    if (code === 429) {
      const wait = (attempt + 1) * 5000;
      Logger.log('Rate limited. Waiting ' + wait + 'ms before retry ' + (attempt + 1) + '/' + maxRetries);
      Utilities.sleep(wait);
      continue;
    }

    Logger.log('Discord post failed (status ' + code + '): ' + response.getContentText());
    return response;
  }

  Logger.log('Discord post failed after ' + maxRetries + ' retries');
}


// =====================================================
// EMBED BUILDERS
// =====================================================

function buildCritiqueThreadName(title, mediums, name) {
  const mediumPart = mediums && mediums.length ? mediums.join(' · ') : 'Submission';
  const titlePart = title || 'Untitled';
  const combined = titlePart + ' — ' + mediumPart;
  return combined.slice(0, 100);
}

function buildCritiqueEmbed(r, name, title, mediums) {
  const email = r['_email'] || 'Not provided';
  const ig = r['Instagram handle'] || '';
  const otherSocial = r['Other social or portfolio link'] || '';
  const description = r['One-line description'] || '';
  const link = r['Link to your work'] || '';
  const feedbackWanted = r['What kind of feedback are you looking for?'] || '';
  const notes = r['Anything we should know before reviewing?'] || '';
  const featurePermission = r['Are we allowed to feature your work in a public review?'] || 'Not specified';
  const heardAbout = r['How did you hear about NSMT?'] || '';

  const mediumLine = mediums.length ? '**' + mediums.join(' · ') + '**' : '**Submission**';

  const fields = [
    {
      name: '🎥 The Work',
      value: '**' + title + '**\n' + (link ? '[Open submission](' + link + ')' : '_no link provided_'),
      inline: false,
    },
    {
      name: '📝 Description',
      value: truncate(description, 400) || '_none_',
      inline: false,
    },
    {
      name: '🎯 Feedback wanted',
      value: truncate(feedbackWanted, 600) || '_none_',
      inline: false,
    },
  ];

  if (notes) {
    fields.push({ name: '📌 Notes from submitter', value: truncate(notes, 400), inline: false });
  }

  const contactParts = ['📧 ' + email];
  if (ig) contactParts.push('IG: ' + ig);
  if (otherSocial) contactParts.push(otherSocial);
  fields.push({ name: '👤 Contact', value: contactParts.join(' · '), inline: false });

  fields.push({
    name: '📺 Permission to feature publicly',
    value: featurePermission,
    inline: true,
  });

  const footerParts = [];
  if (heardAbout) footerParts.push('Heard via: ' + heardAbout);

  return {
    title: '🎬 New Critique — ' + truncate(name, 60),
    description: mediumLine,
    color: NSMT_BLUE,
    fields: fields,
    footer: { text: footerParts.join(' · ') || 'NSMT critique submission' },
    timestamp: new Date().toISOString(),
  };
}


// =====================================================
// UTILITIES
// =====================================================

function parseResponses(formResponse) {
  const out = {};
  formResponse.getItemResponses().forEach(ir => {
    out[ir.getItem().getTitle()] = ir.getResponse();
  });
  try { out['_email'] = formResponse.getRespondentEmail(); } catch (e) {}
  try { out['_timestamp'] = formResponse.getTimestamp(); } catch (e) {}
  return out;
}

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
