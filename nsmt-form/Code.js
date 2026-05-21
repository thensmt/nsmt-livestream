// =====================================================
// NSMT Application Form + Discord Integration
// =====================================================
//
// One-time setup (run these from the Apps Script editor):
//   1. setupDiscordTrigger()      - Wires the form-submit trigger. Run ONCE.
//   2. pingDiscord()              - Verify the webhook works (creates a test thread).
//   3. testDiscordNotification()  - Test full embed using the latest real submission.
//
// Automatic:
//   notifyDiscordOnSubmit(e)      - Fires on every new form submission.
//
// DO NOT re-run createNSMTApplicationForm() - it creates a NEW form.
// =====================================================

const FORM_CONFIG = {
  title: 'NSMT Summer Team Application',
  description: [
    'Thanks for your interest in joining Nova Sports Media Team (NSMT).',
    '',
    'We are bringing on summer talent across photo, video, journalism, and social media.',
    'This form should take about 8-10 minutes. We will review every submission and reach out',
    'within 7 days if we would like to move forward with an interview.',
    '',
    'Follow @the_nsmt on Instagram for updates.',
  ].join('\n'),
  responseSpreadsheetName: 'NSMT Applications - Summer 2026',
  confirmationMessage:
    'Thanks for applying! We will review your application and reach out within 7 days if we want to move forward. Follow @the_nsmt on Instagram in the meantime.',
  formId: '1WRAt5jHuSFZclEIrmWXUAIVvv5yai3QtehZLRRuuGdU',
};

// Cloudflare Worker proxy. The real Discord webhook URL lives only as a
// worker secret. Apps Script authenticates to the worker with SHARED_SECRET
// stored in Script Properties (Project Settings → Script Properties).
const PROXY_URL = 'https://nsmt-discord-proxy.old-glitter-7307.workers.dev';

const NSMT_BLUE = 0x0E80FC;


// =====================================================
// FORM CREATION (already run - do not run again)
// =====================================================

function createNSMTApplicationForm() {
  const form = FormApp.create(FORM_CONFIG.title)
    .setDescription(FORM_CONFIG.description)
    .setCollectEmail(true)
    .setLimitOneResponsePerUser(true)
    .setAllowResponseEdits(false)
    .setConfirmationMessage(FORM_CONFIG.confirmationMessage);

  addBasicsSection(form);
  addRoleInterestSection(form);
  addExperienceSection(form);
  addPortfolioSection(form);
  addEquipmentSection(form);
  addAvailabilitySection(form);
  addCultureFitSection(form);
  addUploadsSection(form);

  const ss = SpreadsheetApp.create(FORM_CONFIG.responseSpreadsheetName);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  Logger.log('Form (public): ' + form.getPublishedUrl());
  Logger.log('Form (edit):   ' + form.getEditUrl());
  Logger.log('Sheet:         ' + ss.getUrl());
}


// =====================================================
// FORM SECTIONS (unchanged - kept here for completeness)
// =====================================================

function addBasicsSection(form) {
  form.addPageBreakItem()
    .setTitle('Basics')
    .setHelpText('Just the essentials so we can reach you.');

  form.addTextItem().setTitle('Full Name').setRequired(true);
  form.addTextItem().setTitle('Phone Number').setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('OK to text you?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Age range')
    .setChoiceValues(['Under 18', '18-21', '22-25', '26+'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('City or town you live in')
    .setHelpText('Helps us understand your commute to events.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Reliable transportation to events across the DMV?')
    .setChoiceValues([
      'Yes - I have my own car',
      'Sometimes - I can borrow a car or rideshare',
      'No',
    ])
    .setRequired(true);
}

function addRoleInterestSection(form) {
  form.addPageBreakItem().setTitle('Role Interest');

  form.addCheckboxItem()
    .setTitle('Which role(s) are you applying for?')
    .setChoiceValues([
      'Photography',
      'Videography / Broadcast',
      'Journalism / Writing',
      'Social Media / Content Creation',
      'Production Assistant / Utility',
      'Open to anything',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('If you picked multiple roles, rank your top 2')
    .setHelpText('Example: 1) Photography  2) Social Media')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Open to being cross-trained on other roles?')
    .setChoiceValues(['Yes', 'Maybe', 'No'])
    .setRequired(true);
}

function addExperienceSection(form) {
  form.addPageBreakItem().setTitle('Experience');

  form.addMultipleChoiceItem()
    .setTitle('Current status')
    .setChoiceValues([
      'High school student',
      'College student',
      'Recent grad (within 1 year)',
      'Working professional',
      'Other',
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('School and expected graduation year')
    .setHelpText('Write N/A if not applicable.')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Briefly describe any sports media experience')
    .setHelpText('3-4 sentences is plenty.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Have you covered live sports before?')
    .setChoiceValues(['Yes', 'No'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Which sports do you know best?')
    .setChoiceValues([
      'Football',
      'Basketball',
      'Soccer',
      'Lacrosse',
      'Baseball / Softball',
      'Other',
    ])
    .setRequired(true);
}

function addPortfolioSection(form) {
  form.addPageBreakItem()
    .setTitle('Portfolio')
    .setHelpText('Show us your work. At least one link below is strongly encouraged.');

  form.addTextItem()
    .setTitle('Portfolio or personal website link')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Instagram handle')
    .setHelpText('Your creative or sports account - not personal if you keep them separate.')
    .setRequired(false);

  form.addTextItem()
    .setTitle('YouTube or Vimeo reel link')
    .setHelpText('Required if applying for video or broadcast.')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Writing samples link')
    .setHelpText('Required if applying for journalism. Link to published pieces, a blog, or a Google Doc.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Social media accounts you have run')
    .setHelpText('Include handles and any relevant metrics (followers, engagement, growth).')
    .setRequired(false);
}

function addEquipmentSection(form) {
  form.addPageBreakItem().setTitle('Equipment & Software');

  form.addMultipleChoiceItem()
    .setTitle('Do you own a camera?')
    .setChoiceValues([
      'Yes - mirrorless or DSLR',
      'Yes - phone only',
      'No',
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('If yes, what camera(s) do you own?')
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle('Editing software you are comfortable with')
    .setChoiceValues([
      'Adobe Premiere Pro',
      'Adobe Photoshop',
      'Adobe Lightroom',
      'Photo Mechanic',
      'Final Cut Pro',
      'DaVinci Resolve',
      'CapCut',
      'Canva',
      'None yet',
    ])
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Comfort level with Adobe Creative Cloud')
    .setBounds(1, 5)
    .setLabels('Never used it', 'Use it daily')
    .setRequired(true);
}

function addAvailabilitySection(form) {
  form.addPageBreakItem().setTitle('Availability');

  form.addMultipleChoiceItem()
    .setTitle('Hours per week you can commit')
    .setChoiceValues(['Under 10', '10-20', '20-30', '30+'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Available Friday nights? (football coverage)')
    .setChoiceValues(['Yes', 'Sometimes', 'No'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Available weekends? (AAU, basketball, lacrosse)')
    .setChoiceValues(['Yes', 'Sometimes', 'No'])
    .setRequired(true);

  form.addDateItem()
    .setTitle('Earliest start date')
    .setRequired(true);

  form.addDateItem()
    .setTitle('End date / when school or other commitments resume')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Any blackout dates this summer?')
    .setHelpText('Vacations, conflicts, exam weeks. Optional.')
    .setRequired(false);
}

function addCultureFitSection(form) {
  form.addPageBreakItem().setTitle('About You');

  form.addTextItem()
    .setTitle('How did you hear about NSMT?')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Why NSMT specifically?')
    .setHelpText('3-5 sentences. What about what we do interests you?')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Long-term goal in sports media')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Comfortable using Discord for team communication?')
    .setChoiceValues([
      'Yes - I use it daily',
      'Yes - I can learn',
      'No',
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Anything else you want us to know?')
    .setRequired(false);
}

function addUploadsSection(form) {
  form.addPageBreakItem()
    .setTitle('Resume & Work Samples')
    .setHelpText('Share shareable links instead of uploading files directly.');

  form.addTextItem()
    .setTitle('Resume link')
    .setHelpText('Google Drive, Dropbox, or any shareable link. Set sharing to "Anyone with the link can view."')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Additional work sample link (optional)')
    .setHelpText('Photo, video, or PDF link. Most applicants will use the Portfolio section above.')
    .setRequired(false);
}


// =====================================================
// DISCORD INTEGRATION
// =====================================================

/**
 * Wire the form-submit trigger. Safe to re-run; removes old triggers first.
 */
function setupDiscordTrigger() {
  const form = FormApp.openById(FORM_CONFIG.formId);

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'notifyDiscordOnSubmit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('notifyDiscordOnSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('✓ Trigger installed. New submissions will post to Discord.');
}

/**
 * Quick webhook check - creates a small test thread in #applications.
 */
function pingDiscord() {
  const payload = {
    thread_name: '🟢 Webhook connection test',
    content: 'Connection test from NSMT Apps Script. Safe to delete this thread.',
  };

  const response = postToDiscord(payload);
  if (response) {
    Logger.log('Status: ' + response.getResponseCode());
    Logger.log('Body:   ' + response.getContentText());
  }
}

/**
 * Replay the latest real submission through the Discord notifier.
 * Useful for iterating on embed design without creating fake submissions.
 */
function testDiscordNotification() {
  const form = FormApp.openById(FORM_CONFIG.formId);
  const responses = form.getResponses();
  if (responses.length === 0) {
    throw new Error('No form responses yet to test with. Submit one first.');
  }
  const latest = responses[responses.length - 1];
  notifyDiscordOnSubmit({ response: latest });
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

/**
 * Fires automatically on every new form submission.
 */
function notifyDiscordOnSubmit(e) {
  try {
    const r = parseResponses(e.response);
    const name = r['Full Name'] || 'Unknown Applicant';
    const roles = asArray(r['Which role(s) are you applying for?']);

    const payload = {
      thread_name: buildThreadName(name, roles),
      embeds: [buildEmbed(r, name, roles)],
    };

    postToDiscord(payload);
  } catch (err) {
    Logger.log('Error in notifyDiscordOnSubmit: ' + err.message);
    Logger.log(err.stack);
  }
}


// =====================================================
// EMBED BUILDERS
// =====================================================

function buildThreadName(name, roles) {
  if (!roles || roles.length === 0) {
    return name.slice(0, 100);
  }
  const abbrev = roles.slice(0, 3).map(abbreviateRole).join(' · ');
  return `${name} — ${abbrev}`.slice(0, 100);
}

function abbreviateRole(role) {
  const map = {
    'Photography': 'Photo',
    'Videography / Broadcast': 'Video',
    'Journalism / Writing': 'Journalism',
    'Social Media / Content Creation': 'Social',
    'Production Assistant / Utility': 'Production',
    'Open to anything': 'Open',
  };
  return map[role] || role;
}

function buildEmbed(r, name, roles) {
  const status = r['Current status'] || 'Unknown status';
  const school = r['School and expected graduation year'] || '';
  const city = r['City or town you live in'] || 'Unknown';
  const transport = r['Reliable transportation to events across the DMV?'] || 'Unknown';
  const hours = r['Hours per week you can commit'] || 'Unknown';
  const weekends = r['Available weekends? (AAU, basketball, lacrosse)'] || 'Unknown';
  const fridays = r['Available Friday nights? (football coverage)'] || 'Unknown';
  const startDate = r['Earliest start date'] || 'Unknown';
  const endDate = r['End date / when school or other commitments resume'] || 'Unknown';
  const email = r['_email'] || 'Unknown';
  const phone = r['Phone Number'] || 'Unknown';
  const okText = r['OK to text you?'] || '';
  const sportsExp = r['Briefly describe any sports media experience'] || '';
  const sports = asArray(r['Which sports do you know best?']).join(', ');
  const liveSports = r['Have you covered live sports before?'] || '';
  const ownsCamera = r['Do you own a camera?'] || '';
  const cameraDetails = r['If yes, what camera(s) do you own?'] || '';
  const software = asArray(r['Editing software you are comfortable with']).join(', ');
  const adobeComfort = r['Comfort level with Adobe Creative Cloud'] || '?';
  const whyNsmt = r['Why NSMT specifically?'] || '';
  const longTermGoal = r['Long-term goal in sports media'] || '';
  const heardAbout = r['How did you hear about NSMT?'] || '';
  const discordOk = r['Comfortable using Discord for team communication?'] || '';
  const ranking = r['If you picked multiple roles, rank your top 2'] || '';

  const links = collectLinks(r);
  const missing = detectMissing(r, roles);

  const rolesLine = roles.length ? roles.join(' · ') : 'Not specified';
  const description = [
    `**${rolesLine}**`,
    `${status}${school && school !== 'N/A' ? ` · ${school}` : ''}`,
  ].join('\n');

  const fields = [
    { name: '📍 Location', value: `${city}\n🚗 ${transport}`, inline: true },
    { name: '⏱️ Availability', value: `${hours} hrs/wk\nWeekends: ${weekends}\nFridays: ${fridays}`, inline: true },
    { name: '🗓️ Window', value: `${formatDate(startDate)} →\n${formatDate(endDate)}`, inline: true },
    { name: '📧 Contact', value: `${email}\n📱 ${phone}${okText === 'Yes' ? ' (text OK)' : ''}`, inline: false },
    { name: '💼 Experience', value: truncate(sportsExp, 400) + (sports ? `\n\n*Sports:* ${sports} · *Live sports covered:* ${liveSports}` : ''), inline: false },
    { name: '🎬 Toolkit', value: `${ownsCamera}${cameraDetails ? ` (${cameraDetails})` : ''}\n${software || 'No software listed'}\nAdobe CC comfort: **${adobeComfort}/5**`, inline: false },
  ];

  if (ranking) {
    fields.push({ name: '🎯 Role ranking', value: ranking, inline: false });
  }

  if (links.length) {
    fields.push({ name: '🔗 Links', value: links.join(' · '), inline: false });
  }

  if (missing.length) {
    fields.push({ name: '⚠️ Missing materials', value: missing.join(' · '), inline: false });
  }

  if (whyNsmt) {
    fields.push({ name: '💭 Why NSMT', value: `*"${truncate(whyNsmt, 500)}"*`, inline: false });
  }

  if (longTermGoal) {
    fields.push({ name: '🎯 Long-term goal', value: truncate(longTermGoal, 200), inline: false });
  }

  const footerParts = [];
  if (heardAbout) footerParts.push(`Heard via: ${heardAbout}`);
  if (discordOk) footerParts.push(`Discord: ${discordOk}`);

  return {
    title: `📋 New Application — ${name}`,
    description: description,
    color: NSMT_BLUE,
    fields: fields,
    footer: { text: footerParts.join(' · ') || 'NSMT form submission' },
    timestamp: new Date().toISOString(),
  };
}

function collectLinks(r) {
  const out = [];
  const add = (label, val) => {
    if (val && /^https?:\/\//.test(String(val).trim())) {
      out.push(`[${label}](${String(val).trim()})`);
    }
  };
  add('Portfolio', r['Portfolio or personal website link']);
  add('Reel', r['YouTube or Vimeo reel link']);
  add('Writing', r['Writing samples link']);
  add('Resume', r['Resume link']);
  add('Sample', r['Additional work sample link (optional)']);

  const ig = r['Instagram handle'];
  if (ig) out.push(`IG: ${String(ig).trim()}`);

  return out;
}

function detectMissing(r, roles) {
  const missing = [];
  const rolesStr = (roles || []).join(' ').toLowerCase();

  const has = key => {
    const v = r[key];
    return v && String(v).trim().length > 0;
  };

  if (!has('Portfolio or personal website link')) missing.push('Portfolio');
  if (!has('Instagram handle')) missing.push('IG handle');
  if (!has('Resume link')) missing.push('Resume');

  if (rolesStr.includes('video') || rolesStr.includes('broadcast')) {
    if (!has('YouTube or Vimeo reel link')) missing.push('Reel');
  }
  if (rolesStr.includes('journalism') || rolesStr.includes('writing')) {
    if (!has('Writing samples link')) missing.push('Writing samples');
  }

  return missing;
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

function formatDate(val) {
  if (!val) return 'Unknown';
  const s = String(val);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mo, d] = m;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo) - 1]} ${parseInt(d)}, ${y}`;
}
