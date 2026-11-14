import { Bot, InlineKeyboard, InputFile } from 'grammy';
import {
  getSession,
  updateSession,
  resetSession,
  stepBack,
  getUserPreferences,
  saveUserPreferences,
  checkRateLimit,
  incrementRateLimit,
} from './session-store';
import {
  extractQuestionsFromInput,
  formatQuestionListPreview,
  extractQuestionsFromPreviewText,
  MAX_FILE_SIZE_BYTES,
} from './question-extractor';
import { solveQuestionWithAi } from './bot-ai';
import { executeQuestionCode } from './bot-runner';
import { generateAssignmentDocxBuffer, SolvedQuestionDocItem } from '../docx/docx-generator';
import { generateServerAssignmentPdf } from './bot-pdf';
import { TerminalStyle } from '../engine/server-terminal-renderer';

// Global singleton instance of grammY bot
let cachedBot: Bot | null = null;

export function isTelegramBotEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function getTelegramBot(): Promise<Bot | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return null;

  if (cachedBot) {
    if (!cachedBot.isInited()) {
      try {
        await cachedBot.init();
      } catch (err) {
        // Fallback default botInfo if Telegram API is slow
        cachedBot.botInfo = {
          id: 12345678,
          is_bot: true,
          first_name: 'YourAssignmentBot',
          username: 'YourAssignmentBot',
          can_join_groups: true,
          can_read_all_group_messages: false,
          supports_inline_queries: false,
        } as any;
      }
    }
    return cachedBot;
  }

  const bot = new Bot(token);
  registerBotHandlers(bot);

  try {
    await bot.init();
  } catch (err) {
    // Provide fallback botInfo so handleUpdate never throws "Bot not initialized"
    bot.botInfo = {
      id: 12345678,
      is_bot: true,
      first_name: 'YourAssignmentBot',
      username: 'YourAssignmentBot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
    } as any;
  }

  cachedBot = bot;
  return cachedBot;
}

/**
 * Helper to build high-convenience question confirmation keyboard
 */
function createQuestionsConfirmKeyboard(isHindi: boolean = false): InlineKeyboard {
  return new InlineKeyboard()
    .text(isHindi ? '🚀 तुरंत DOCX बनाएं' : '🚀 Quick Generate DOCX', 'quick_generate')
    .row()
    .text(isHindi ? '📖 केवल थ्योरी (Theory Only)' : '📖 Theory Only', 'ans_theory')
    .text(isHindi ? '💻 कोड + आउटपुट' : '💻 Code + Screenshots', 'ans_code')
    .row()
    .text(isHindi ? '⚙️ नाम व सेटिंग्स बदलें' : '⚙️ Customize Header & Options', 'confirm_questions_ok')
    .text(isHindi ? '❌ रद्द करें' : '❌ Cancel', 'action_cancel');
}

/**
 * Registers all commands, message handlers, and callback query actions
 */
function registerBotHandlers(bot: Bot) {
  // 1. /start command
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    const session = resetSession(chatId);
    const prefs = getUserPreferences(chatId);

    const isHindi = session.isHindi;
    const welcome = isHindi
      ? `👋 **YourAssignment Bot में आपका स्वागत है!**\n\n` +
        `यहाँ आप अपने असाइनमेंट प्रश्न भेजकर तुरंत प्रोफेशनल **Word (.docx)** और **PDF** फाइल तैयार कर सकते हैं:\n\n` +
        `• **Text मैसेज**: प्रश्न यहाँ सीधे टाइप या पेस्ट करें\n` +
        `• **फाइल अपलोड**: .txt, .docx, .pdf या फोटो भेजें\n` +
        `• **रियल आउटपुट**: Authentic MySQL और Terminal स्क्रीनशॉट्स आपके कस्टम लोकेशन के साथ!\n\n` +
        `शुरू करने के लिए अपना प्रश्न भेजें या कोई फाइल अपलोड करें।`
      : `👋 **Welcome to YourAssignment Bot!**\n\n` +
        `Create professional university assignment submissions (.docx & PDF) with real execution screenshots and custom terminal prompts.\n\n` +
        `📌 **How to begin:**\n` +
        `1. Send your questions as text, or upload a .txt, .docx, .pdf, or photo.\n` +
        `2. Choose theory or code + real terminal screenshots.\n` +
        `3. Set your custom terminal prompt line (e.g. \`PS D:\\ajeet\\program\\DBMS>\`).\n` +
        `4. Receive your formatted Word document (.docx) and PDF!\n\n` +
        `Send your questions or upload your assignment sheet to start.`;

    const keyboard = new InlineKeyboard()
      .text(isHindi ? '📝 नया असाइनमेंट (/new)' : '📝 New Assignment (/new)', 'action_new')
      .text(isHindi ? '⚙️ सेटिंग्स (/settings)' : '⚙️ Settings (/settings)', 'action_settings');

    await ctx.reply(welcome, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // 2. /new command
  bot.command('new', async (ctx) => {
    const session = resetSession(ctx.chat.id, true);
    const msg = session.isHindi
      ? `✨ **नया असाइनमेंट शुरू हुआ!**\n\nकृपया अपने प्रश्न टेक्स्ट में भेजें, या .txt, .docx, .pdf, या इमेज फाइल अपलोड करें।`
      : `✨ **New Assignment started!**\n\nPlease send your question text, or upload a .txt, .docx, .pdf, or image file.`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // 3. /cancel command
  bot.command('cancel', async (ctx) => {
    resetSession(ctx.chat.id, true);
    await ctx.reply('❌ Current workflow cancelled. Send /new to start over.');
  });

  // 4. /back command
  bot.command('back', async (ctx) => {
    const prev = stepBack(ctx.chat.id);
    await ctx.reply(`⬅️ Returned to previous step (${prev}). Send /new to start fresh or continue.`);
  });

  // 5. /help command
  bot.command('help', async (ctx) => {
    const helpText =
      `📖 **YourAssignment Bot Help & Commands**\n\n` +
      `• \`/new\` - Start a fresh assignment session\n` +
      `• \`/cancel\` - Cancel current wizard and reset\n` +
      `• \`/back\` - Go back to previous step\n` +
      `• \`/settings\` - View and edit saved name, roll no, terminal preferences\n` +
      `• \`/help\` - Show this help menu\n\n` +
      `📎 **Supported Uploads:**\n` +
      `• Text messages\n` +
      `• Documents: .txt, .docx, .pdf (up to 10 MB)\n` +
      `• Images: .png, .jpg photos of question sheets\n\n` +
      `💻 **Real Execution Engines:**\n` +
      `• SQL: In-memory MySQL engine with ASCII tables\n` +
      `• Python, C, C++, Java, JavaScript\n` +
      `• Custom terminal styles: VS Code, PowerShell, CMD, Ubuntu, macOS`;
    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  // 6. /settings command
  bot.command('settings', async (ctx) => {
    await renderSettingsView(ctx);
  });

  // 7. Handle Document File Uploads (.txt, .docx, .pdf)
  bot.on('message:document', async (ctx) => {
    const doc = ctx.message.document;
    const chatId = ctx.chat.id;

    if (doc.file_size && doc.file_size > MAX_FILE_SIZE_BYTES) {
      await ctx.reply(
        `⚠️ File is too large (${(doc.file_size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`
      );
      return;
    }

    const file = await ctx.getFile();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    await ctx.replyWithChatAction('typing');

    try {
      const res = await fetch(fileUrl);
      const arrayBuf = await res.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuf);

      const result = await extractQuestionsFromInput({
        fileBuffer,
        fileName: doc.file_name || 'document.txt',
        mimeType: doc.mime_type,
      });

      if (!result.success || result.questions.length === 0) {
        await ctx.reply(`⚠️ ${result.error || 'Could not extract questions from this file.'}`);
        return;
      }

      const session = updateSession(chatId, {
        questions: result.questions,
        rawText: result.rawText,
        currentStep: 'confirm_questions',
      });

      await ctx.reply(formatQuestionListPreview(result.questions, session.isHindi), {
        parse_mode: 'Markdown',
        reply_markup: createQuestionsConfirmKeyboard(session.isHindi),
      });
    } catch (err: any) {
      await ctx.reply(`⚠️ Failed to process uploaded document: ${err.message}`);
    }
  });

  // 8. Handle Photo Uploads (Question Sheet Photos)
  bot.on('message:photo', async (ctx) => {
    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1]; // highest resolution
    const chatId = ctx.chat.id;

    await ctx.reply('🔍 Scanning image for assignment questions using AI OCR...');
    await ctx.replyWithChatAction('typing');

    try {
      const file = await ctx.api.getFile(bestPhoto.file_id);
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      const res = await fetch(fileUrl);
      const arrayBuf = await res.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuf);

      const result = await extractQuestionsFromInput({
        fileBuffer,
        fileName: 'question_sheet.jpg',
        mimeType: 'image/jpeg',
      });

      if (!result.success || result.questions.length === 0) {
        await ctx.reply(`⚠️ ${result.error || 'Could not find questions in the photo.'}`);
        return;
      }

      const session = updateSession(chatId, {
        questions: result.questions,
        rawText: result.rawText,
        currentStep: 'confirm_questions',
      });

      await ctx.reply(formatQuestionListPreview(result.questions, session.isHindi), {
        parse_mode: 'Markdown',
        reply_markup: createQuestionsConfirmKeyboard(session.isHindi),
      });
    } catch (err: any) {
      await ctx.reply(`⚠️ Failed to analyze photo: ${err.message}`);
    }
  });

  // 9. Handle Regular Text Messages
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim();
    const chatId = ctx.chat.id;
    const session = getSession(chatId);

    // Detect Hindi script
    if (/[\u0900-\u097F]/.test(text)) {
      session.isHindi = true;
      updateSession(chatId, { isHindi: true });
    }

    // Step routing based on session state
    switch (session.currentStep) {
      case 'idle': {
        // User sent questions as text
        const result = await extractQuestionsFromInput({ text });
        if (result.success && result.questions.length > 0) {
          updateSession(chatId, {
            questions: result.questions,
            rawText: result.rawText,
            currentStep: 'confirm_questions',
          });

          await ctx.reply(formatQuestionListPreview(result.questions, session.isHindi), {
            parse_mode: 'Markdown',
            reply_markup: createQuestionsConfirmKeyboard(session.isHindi),
          });
        } else {
          await ctx.reply(
            session.isHindi
              ? `कृपया अपने असाइनमेंट के प्रश्न भेजें या कोई फाइल (.txt, .docx, .pdf, photo) अपलोड करें।`
              : `Please send your assignment questions, or upload a .txt, .docx, .pdf, or photo to begin.`
          );
        }
        break;
      }

      case 'confirm_questions': {
        const lower = text.toLowerCase();
        if (lower === 'ok' || lower === 'yes' || lower === 'haan' || lower === 'theek hai') {
          await promptStep1AnswerType(ctx);
        } else if (lower.startsWith('delete') || lower.startsWith('remove')) {
          const numMatch = lower.match(/\d+/);
          if (numMatch) {
            const targetIdx = parseInt(numMatch[0], 10) - 1;
            if (targetIdx >= 0 && targetIdx < session.questions.length) {
              session.questions.splice(targetIdx, 1);
              updateSession(chatId, { questions: session.questions });
              await ctx.reply(`🗑️ Removed question ${numMatch[0]}.`);
              await ctx.reply(formatQuestionListPreview(session.questions, session.isHindi), {
                parse_mode: 'Markdown',
                reply_markup: createQuestionsConfirmKeyboard(session.isHindi),
              });
            } else {
              await ctx.reply(`⚠️ Question number ${numMatch[0]} not found.`);
            }
          }
        } else {
          // Parse potential multiple questions from incoming text
          const extracted = await extractQuestionsFromInput({ text });
          const newItems =
            extracted.success && extracted.questions.length > 0
              ? extracted.questions
              : [
                  {
                    id: `q-${session.questions.length + 1}`,
                    numberLabel: `Q${session.questions.length + 1}`,
                    text,
                    type: 'theory',
                  },
                ];

          for (const item of newItems) {
            const nextIdx = session.questions.length + 1;
            session.questions.push({
              ...item,
              id: `q-${nextIdx}`,
              numberLabel: `Q${nextIdx}`,
            });
          }

          updateSession(chatId, { questions: session.questions });
          await ctx.reply(`➕ Added ${newItems.length} question(s)!`);
          await ctx.reply(formatQuestionListPreview(session.questions, session.isHindi), {
            parse_mode: 'Markdown',
            reply_markup: createQuestionsConfirmKeyboard(session.isHindi),
          });
        }
        break;
      }

      case 'step2_prompt_location': {
        // User typed custom prompt location
        updateSession(chatId, {
          promptLocation: text,
          currentStep: 'step3_filename',
        });
        saveUserPreferences(chatId, { defaultPromptLocation: text });
        await ctx.reply(`📍 Saved custom terminal prompt:\n\`${text}\``, { parse_mode: 'Markdown' });
        await promptStep3Filename(ctx);
        break;
      }

      case 'step2_sql_db_name': {
        updateSession(chatId, {
          sqlDatabaseName: text.replace(/[^a-zA-Z0-9_]/g, ''),
          currentStep: 'step3_filename',
        });
        await promptStep3Filename(ctx);
        break;
      }

      case 'step3_filename': {
        let cleanName = text.replace(/[^a-zA-Z0-9_\-]/g, '_');
        if (!cleanName.endsWith('.docx')) cleanName += '.docx';
        updateSession(chatId, {
          filename: cleanName,
          currentStep: 'step4_header_name',
        });
        await promptStep4StudentName(ctx);
        break;
      }

      case 'step4_header_name': {
        if (text.toLowerCase() !== 'skip') {
          // Detect if roll number was also provided e.g. "Ajeet kumar (255ISC014)"
          const parenMatch = text.match(/^([^\(\)]+)\s*\(([^)]+)\)$/);
          if (parenMatch) {
            const name = parenMatch[1].trim();
            const roll = parenMatch[2].trim();
            session.header.studentName = name;
            session.header.rollNo = roll;
            saveUserPreferences(chatId, { name, rollNo: roll });
            await ctx.reply(`👤 Student: **${name}**\n🆔 Roll: **${roll}**`, { parse_mode: 'Markdown' });
            updateSession(chatId, { header: session.header, currentStep: 'step4_header_course' });
            await promptStep4Course(ctx);
            break;
          }

          session.header.studentName = text;
          saveUserPreferences(chatId, { name: text });
        }
        updateSession(chatId, { header: session.header, currentStep: 'step4_header_roll' });
        await promptStep4RollNo(ctx);
        break;
      }

      case 'step4_header_roll': {
        if (text.toLowerCase() !== 'skip') {
          session.header.rollNo = text;
          saveUserPreferences(chatId, { rollNo: text });
        }
        updateSession(chatId, { header: session.header, currentStep: 'step4_header_course' });
        await promptStep4Course(ctx);
        break;
      }

      case 'step4_header_course': {
        if (text.toLowerCase() !== 'skip') {
          // Detect if course and subject are provided together e.g. "int btech cse — Database management lab"
          const delimiterMatch = text.match(/^(.+?)\s*(?:—|–|-|\|)\s*(.+)$/);
          if (delimiterMatch) {
            const course = delimiterMatch[1].trim();
            const subject = delimiterMatch[2].trim();
            session.header.className = course;
            session.header.subject = subject;
            saveUserPreferences(chatId, { course, subject });
            await ctx.reply(`🎓 Course: **${course}**\n📚 Subject: **${subject}**`, { parse_mode: 'Markdown' });
            updateSession(chatId, { header: session.header, currentStep: 'step4_header_title' });
            await promptStep4Title(ctx);
            break;
          }

          session.header.className = text;
          saveUserPreferences(chatId, { course: text });
        }
        updateSession(chatId, { header: session.header, currentStep: 'step4_header_subject' });
        await promptStep4Subject(ctx);
        break;
      }

      case 'step4_header_subject': {
        if (text.toLowerCase() !== 'skip') {
          session.header.subject = text;
          saveUserPreferences(chatId, { subject: text });
        }
        updateSession(chatId, { header: session.header, currentStep: 'step4_header_title' });
        await promptStep4Title(ctx);
        break;
      }

      case 'step4_header_title': {
        if (text.toLowerCase() !== 'skip') {
          session.header.assignmentTitle = text;
          saveUserPreferences(chatId, { assignmentTitle: text });
        }
        updateSession(chatId, { header: session.header, currentStep: 'step5_summary' });
        await renderSummaryCard(ctx);
        break;
      }

      default: {
        await ctx.reply(
          `Command not recognized. Type /new to start a new assignment or /help for guidance.`
        );
        break;
      }
    }
  });

  // 10. Handle Inline Button Callbacks (callback_query:data)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    await ctx.answerCallbackQuery();
    let session = getSession(chatId);

    // Auto-recover questions across serverless container boundaries
    if (session.questions.length === 0) {
      const prefs = getUserPreferences(chatId);
      if (prefs.lastQuestions && prefs.lastQuestions.length > 0) {
        session = updateSession(chatId, {
          questions: [...prefs.lastQuestions],
          rawText: prefs.lastRawText || '',
        });
      } else if (
        ctx.callbackQuery?.message &&
        'text' in ctx.callbackQuery.message &&
        ctx.callbackQuery.message.text
      ) {
        const recovered = extractQuestionsFromPreviewText(ctx.callbackQuery.message.text);
        if (recovered.length > 0) {
          session = updateSession(chatId, { questions: recovered });
          saveUserPreferences(chatId, { lastQuestions: recovered });
        }
      }
    }

    // Commands / Navigation
    if (data === 'action_new') {
      resetSession(chatId, true);
      await ctx.reply('✨ Send your questions as text or upload a document/photo to begin.');
      return;
    }

    if (data === 'action_cancel') {
      resetSession(chatId, true);
      await ctx.reply('❌ Assignment session cancelled. Send /new anytime.');
      return;
    }

    if (data === 'quick_generate') {
      if (session.questions.length === 0) {
        await ctx.reply(
          `⚠️ **No questions detected!**\nPlease send your assignment questions as text or upload a document before generating.`
        );
        return;
      }
      await executeAndSendAssignment(ctx);
      return;
    }

    if (data === 'action_settings') {
      await renderSettingsView(ctx);
      return;
    }

    if (data === 'confirm_questions_ok') {
      await promptStep1AnswerType(ctx);
      return;
    }

    // Step 1: Answer Type
    if (data === 'ans_theory') {
      updateSession(chatId, {
        answerType: 'theory',
        includeTerminal: false,
        currentStep: 'step3_filename',
      });
      await promptStep3Filename(ctx);
      return;
    }

    if (data === 'ans_code') {
      updateSession(chatId, {
        answerType: 'code_screenshot',
        includeTerminal: true,
        currentStep: 'step2_terminal_choice',
      });
      await promptStep2TerminalChoice(ctx);
      return;
    }

    // Step 2: Terminal Choice
    if (data === 'terminal_yes') {
      updateSession(chatId, { includeTerminal: true, currentStep: 'step2_language' });
      await promptStep2Language(ctx);
      return;
    }

    if (data === 'terminal_no') {
      updateSession(chatId, { includeTerminal: false, currentStep: 'step3_filename' });
      await promptStep3Filename(ctx);
      return;
    }

    // Language Selection
    if (data.startsWith('lang_')) {
      const selectedLang = data.replace('lang_', '');
      updateSession(chatId, {
        language: selectedLang,
        currentStep: 'step2_terminal_style',
      });
      await promptStep2TerminalStyle(ctx, selectedLang);
      return;
    }

    // Terminal Style Selection
    if (data.startsWith('style_')) {
      const selectedStyle = data.replace('style_', '') as TerminalStyle;
      updateSession(chatId, {
        terminalStyle: selectedStyle,
        currentStep: 'step2_prompt_location',
      });
      saveUserPreferences(chatId, { defaultTerminalStyle: selectedStyle });
      await promptStep2PromptLocation(ctx, selectedStyle);
      return;
    }

    if (data === 'skip_prompt') {
      updateSession(chatId, { currentStep: 'step3_filename' });
      await promptStep3Filename(ctx);
      return;
    }

    // Step 3: Default Filename
    if (data === 'use_default_filename') {
      const today = new Date().toISOString().slice(0, 10);
      updateSession(chatId, {
        filename: `Assignment_${today}.docx`,
        currentStep: 'step4_header_name',
      });
      await promptStep4StudentName(ctx);
      return;
    }

    // Step 4: Skip Header / Use Saved
    if (data === 'skip_header_all') {
      updateSession(chatId, { currentStep: 'step5_summary' });
      await renderSummaryCard(ctx);
      return;
    }

    // Step 5: Generate
    if (data === 'generate_docx') {
      if (session.questions.length === 0) {
        await ctx.reply(
          session.isHindi
            ? `⚠️ **सत्र में कोई प्रश्न नहीं मिले!** कृपया असाइनमेंट बनाने के लिए प्रश्न भेजें। नया सत्र शुरू करने के लिए /new लिखें।`
            : `⚠️ **No questions detected in session!**\nPlease send your assignment questions or upload a document/photo.\n\nSend /new to start fresh.`
        );
        return;
      }
      await executeAndSendAssignment(ctx);
      return;
    }

    if (data === 'change_settings') {
      await promptStep1AnswerType(ctx);
      return;
    }

    // Follow-up Actions after Document Generation
    if (data === 'followup_pdf') {
      await sendPdfFollowup(ctx);
      return;
    }

    if (data === 'followup_images') {
      await sendScreenshotsFollowup(ctx);
      return;
    }

    if (data === 'followup_handwriting') {
      await sendHandwritingFollowup(ctx);
      return;
    }

    if (data === 'followup_change_prompt') {
      updateSession(chatId, { currentStep: 'step2_prompt_location' });
      await ctx.reply(
        `✏️ **Enter new terminal prompt location:**\n(e.g. \`C:\\Users\\Ajeet\\Desktop\\DSA>\`)`
      );
      return;
    }
  });
}

// ============================================================================
// Step-by-Step Wizards & Prompts
// ============================================================================

async function promptStep1AnswerType(ctx: any) {
  const session = updateSession(ctx.chat.id, { currentStep: 'step1_answer_type' });
  const keyboard = new InlineKeyboard()
    .text('📖 A. Questions & Answers Only (Theory)', 'ans_theory')
    .row()
    .text('💻 B. Question + Code + Output Screenshot', 'ans_code');

  const text = session.isHindi
    ? `**स्टेप 1: उत्तर का प्रकार चुनें (Step 1: Answer Type)**\n\n` +
      `आप किस प्रकार का असाइनमेंट बनाना चाहते हैं?`
    : `**Step 1: Choose Answer Type**\n\n` +
      `What kind of assignment document would you like to produce?`;

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function promptStep2TerminalChoice(ctx: any) {
  const keyboard = new InlineKeyboard()
    .text('🖥️ Yes, Include Real Terminal Output', 'terminal_yes')
    .row()
    .text('📝 No, Code Only (No Screenshot)', 'terminal_no');

  await ctx.reply(
    `**Step 2: Terminal Output Screenshot?**\n\n` +
      `Should we run the code and attach real themed terminal/MySQL screenshots for each question?`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function promptStep2Language(ctx: any) {
  const keyboard = new InlineKeyboard()
    .text('🪄 Auto-detect', 'lang_auto')
    .text('🗄️ SQL (MySQL)', 'lang_sql')
    .row()
    .text('🐍 Python', 'lang_python')
    .text('⚙️ C', 'lang_c')
    .text('⚡ C++', 'lang_cpp')
    .row()
    .text('☕ Java', 'lang_java')
    .text('🌐 JavaScript', 'lang_javascript');

  await ctx.reply(
    `**Choose Programming / Query Language:**\n\n` +
      `Select the target language for code generation and execution:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function promptStep2TerminalStyle(ctx: any, lang: string) {
  const keyboard = new InlineKeyboard()
    .text('🟦 VS Code Terminal (Default)', 'style_vscode')
    .row()
    .text('🔷 Windows PowerShell', 'style_powershell')
    .row()
    .text('⬛ Command Prompt (CMD)', 'style_cmd')
    .row()
    .text('🟣 Ubuntu Linux', 'style_ubuntu')
    .row()
    .text('🍎 macOS Terminal', 'style_macos');

  if (lang === 'sql') {
    keyboard.row().text('🐬 Classic MySQL 8.4 Monitor', 'style_mysql');
  }

  await ctx.reply(
    `**Select Terminal Window Style:**\n\n` +
      `Choose the visual theme for your execution screenshot:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function promptStep2PromptLocation(ctx: any, style: TerminalStyle) {
  const defaultExample =
    style === 'powershell'
      ? 'PS D:\\ajeet\\program\\DBMS>'
      : style === 'cmd'
      ? 'C:\\Users\\Ajeet\\Desktop\\DSA>'
      : style === 'ubuntu'
      ? 'ajeet@pc:~/programs$'
      : style === 'macos'
      ? 'ajeet@MacBook-Pro ~ %'
      : 'PS D:\\ajeet\\program\\assignment>';

  const keyboard = new InlineKeyboard().text(`⏩ Skip (Use: ${defaultExample})`, 'skip_prompt');

  const text =
    `**Terminal Location / Custom Prompt Line:**\n\n` +
    `Type your own terminal directory path or prompt line to show in the screenshot, for example:\n` +
    `• \`PS D:\\ajeet\\program\\DBMS>\`\n` +
    `• \`C:\\Users\\Ajeet\\Desktop\\DSA>\`\n` +
    `• \`ajeet@pc:~/programs$\`\n\n` +
    `This exact prompt will appear in the output image alongside your run command.\n\n` +
    `_Send your text now, or tap Skip to use the default._`;

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}

async function promptStep3Filename(ctx: any) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultName = `Assignment_${today}.docx`;

  const keyboard = new InlineKeyboard().text(`📄 Use Default (${defaultName})`, 'use_default_filename');

  await ctx.reply(
    `**Step 3: Document File Name**\n\n` +
      `Enter desired filename for your Word document (e.g. \`DBMS_Lab_2\`), or tap below to use the default:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function promptStep4StudentName(ctx: any) {
  const prefs = getUserPreferences(ctx.chat.id);
  const current = prefs.name || 'Ajeet Kumar';

  const keyboard = new InlineKeyboard().text('⏩ Skip All Header Details', 'skip_header_all');

  await ctx.reply(
    `**Step 4: Student Header Details**\n\n` +
      `Printed at the top of your submission document.\n\n` +
      `👤 **Enter Student Name** (or type \`skip\` to use \`${current}\`):`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function promptStep4RollNo(ctx: any) {
  const prefs = getUserPreferences(ctx.chat.id);
  const current = prefs.rollNo || '22BCS1045';

  await ctx.reply(`🆔 **Enter Roll Number** (or type \`skip\` to use \`${current}\`):`, {
    parse_mode: 'Markdown',
  });
}

async function promptStep4Course(ctx: any) {
  const prefs = getUserPreferences(ctx.chat.id);
  const current = prefs.course || 'B.Tech CSE';

  await ctx.reply(`🎓 **Enter Course / Branch** (or type \`skip\` to use \`${current}\`):`, {
    parse_mode: 'Markdown',
  });
}

async function promptStep4Subject(ctx: any) {
  const prefs = getUserPreferences(ctx.chat.id);
  const current = prefs.subject || 'Database Management Systems';

  await ctx.reply(`📚 **Enter Subject** (or type \`skip\` to use \`${current}\`):`, {
    parse_mode: 'Markdown',
  });
}

async function promptStep4Title(ctx: any) {
  const prefs = getUserPreferences(ctx.chat.id);
  const current = prefs.assignmentTitle || 'Assignment 1';

  await ctx.reply(`📝 **Enter Assignment Title** (or type \`skip\` to use \`${current}\`):`, {
    parse_mode: 'Markdown',
  });
}

async function renderSummaryCard(ctx: any) {
  let session = getSession(ctx.chat.id);
  const isHindi = session.isHindi;

  // Auto-recovery across cold serverless containers
  if (session.questions.length === 0) {
    const prefs = getUserPreferences(ctx.chat.id);
    if (prefs.lastQuestions && prefs.lastQuestions.length > 0) {
      session = updateSession(ctx.chat.id, {
        questions: [...prefs.lastQuestions],
        rawText: prefs.lastRawText || '',
      });
    }
  }

  // If questions are still empty, alert user with clear action
  if (session.questions.length === 0) {
    const warningText = isHindi
      ? `⚠️ **सत्र में कोई प्रश्न नहीं मिले!**\n\nकृपया अपने असाइनमेंट के प्रश्न टेक्स्ट के रूप में भेजें या कोई फाइल (.txt, .docx, .pdf, photo) अपलोड करें।\n\nनया असाइनमेंट शुरू करने के लिए /new भेजें।`
      : `⚠️ **No questions found in this session!**\n\nPlease send your assignment questions as text or upload a document/photo to begin.\n\nSend /new to start fresh.`;

    const warnKeyboard = new InlineKeyboard().text(
      isHindi ? '📝 नया असाइनमेंट (/new)' : '📝 New Assignment (/new)',
      'action_new'
    );

    await ctx.reply(warningText, { parse_mode: 'Markdown', reply_markup: warnKeyboard });
    return;
  }

  const card =
    `📋 **${isHindi ? 'असाइनमेंट सारांश (Assignment Summary)' : 'Assignment Submission Summary'}**\n\n` +
    `• **Questions**: ${session.questions.length} questions\n` +
    `• **Answer Type**: ${session.answerType === 'theory' ? 'Theory Only' : 'Code + Real Terminal Screenshots'}\n` +
    (session.includeTerminal
      ? `• **Language**: ${session.language.toUpperCase()}\n` +
        `• **Terminal Style**: ${session.terminalStyle.toUpperCase()}\n` +
        `• **Location Prompt**: \`${session.promptLocation}\`\n`
      : '') +
    `• **File Name**: \`${session.filename}\`\n` +
    `• **Student**: ${session.header.studentName} (${session.header.rollNo})\n` +
    `• **Course & Subject**: ${session.header.className} — ${session.header.subject}\n` +
    `• **Title**: ${session.header.assignmentTitle}\n\n` +
    (isHindi
      ? `दस्तावेज़ बनाने के लिए नीचे **Generate DOCX** बटन दबाएं!`
      : `Ready to generate! Click **Generate DOCX** below.`);

  const keyboard = new InlineKeyboard()
    .text(isHindi ? '🚀 दस्तावेज़ बनाएं (Generate DOCX)' : '🚀 Generate DOCX', 'generate_docx')
    .row()
    .text(isHindi ? '✏️ सेटिंग्स बदलें' : '✏️ Change Settings', 'change_settings')
    .text(isHindi ? '❌ रद्द करें' : '❌ Cancel', 'action_cancel');

  await ctx.reply(card, { parse_mode: 'Markdown', reply_markup: keyboard });
}

// ============================================================================
// Document Generation & Execution Engine
// ============================================================================

async function executeAndSendAssignment(ctx: any) {
  const chatId = ctx.chat.id;
  let session = getSession(chatId);

  // Auto-recovery across cold serverless containers
  if (session.questions.length === 0) {
    const prefs = getUserPreferences(chatId);
    if (prefs.lastQuestions && prefs.lastQuestions.length > 0) {
      session = updateSession(chatId, {
        questions: [...prefs.lastQuestions],
        rawText: prefs.lastRawText || '',
      });
    }
  }

  if (session.questions.length === 0) {
    await ctx.reply(
      session.isHindi
        ? `⚠️ **कोई प्रश्न नहीं मिला!** कृपया असाइनमेंट बनाने से पहले प्रश्न भेजें। नया सत्र शुरू करने के लिए /new लिखें।`
        : `⚠️ **No questions detected!** Please send your assignment questions as text or upload a file before generating.\n\nType /new to start fresh.`
    );
    return;
  }

  // Rate limiting check: max 5 docs per hour
  const rate = checkRateLimit(chatId);
  if (!rate.allowed) {
    await ctx.reply(
      `⏳ **Rate limit reached:** You have created 5 assignments this hour. Please wait ${rate.resetMinutes} minutes before generating another.`
    );
    return;
  }

  updateSession(chatId, { currentStep: 'generating' });
  const statusMsg = await ctx.reply(
    `⏳ **Generating Assignment Submission...**\nPreparing solutions and executing code...`,
    { parse_mode: 'Markdown' }
  );

  const totalQuestions = session.questions.length;
  const solvedItems: SolvedQuestionDocItem[] = [];
  const screenshotStore: { label: string; buffer: Buffer; dataUrl: string }[] = [];

  for (let i = 0; i < totalQuestions; i++) {
    const q = session.questions[i];
    const qNum = i + 1;

    try {
      await ctx.api.editMessageText(
        chatId,
        statusMsg.message_id,
        `⏳ **Solving Question ${qNum} of ${totalQuestions}** (${q.numberLabel})...\nExecuting code and capturing authentic screenshots...`
      );
    } catch {
      // ignore edit throttling
    }

    // 1. Solve with AI or deterministic solver
    const solvedAi = await solveQuestionWithAi(q, session.answerType, session.language);

    let screenshotBuf: Buffer | null = null;
    let screenshotDataUrl: string | undefined = undefined;
    let outputText = '';
    let tableData: any = undefined;

    // 2. Execute code and render screenshots if enabled
    if (session.includeTerminal && solvedAi.codeSnippet) {
      const execResult = await executeQuestionCode(solvedAi.codeSnippet, session.language, {
        terminalStyle: session.terminalStyle,
        promptLocation: session.promptLocation,
        databaseName: session.sqlDatabaseName,
        sqlSchema: session.sqlSchema,
        questionLabel: q.numberLabel,
      });

      screenshotBuf = execResult.outputScreenshotBuffer;
      screenshotDataUrl = execResult.outputScreenshotDataUrl;
      outputText = execResult.outputText;
      tableData = execResult.tableData;

      screenshotStore.push({
        label: q.numberLabel,
        buffer: execResult.outputScreenshotBuffer,
        dataUrl: execResult.outputScreenshotDataUrl,
      });
    }

    solvedItems.push({
      id: q.id,
      numberLabel: q.numberLabel,
      questionText: q.text,
      codeSnippet: solvedAi.codeSnippet,
      codeLanguage: solvedAi.codeLanguage || session.language,
      outputScreenshotDataUrl: screenshotDataUrl,
      outputText,
      tableData,
      explanation: solvedAi.explanation,
      timeComplexity: solvedAi.timeComplexity,
      spaceComplexity: solvedAi.spaceComplexity,
    });
  }

  try {
    await ctx.api.editMessageText(
      chatId,
      statusMsg.message_id,
      `📄 Assembling Word document (.docx) with student header, monospace code, and screenshots...`
    );
  } catch {}

  // 3. Generate DOCX Buffer
  const docxBuffer = await generateAssignmentDocxBuffer({
    header: session.header,
    questions: solvedItems,
    fontFamily: 'Times New Roman',
    includeExplanations: true,
  });

  // 4. Generate companion PDF Buffer
  const pdfBuffer = await generateServerAssignmentPdf({
    header: session.header,
    questions: solvedItems,
    screenshots: screenshotStore,
  });

  // Store buffers in session for follow-ups
  updateSession(chatId, {
    currentStep: 'completed',
    generatedDocxBuffer: docxBuffer,
    generatedPdfBuffer: pdfBuffer,
    screenshots: screenshotStore,
  });
  incrementRateLimit(chatId);

  // 5. Send DOCX file
  const isHindi = session.isHindi;
  const caption = isHindi
    ? `✅ **आपका असाइनमेंट तैयार है!**\n\n` +
      `📄 **फाइल**: \`${session.filename}\`\n` +
      `• छात्र: ${session.header.studentName} (${session.header.rollNo})\n` +
      `• विषय: ${session.header.subject}\n` +
      `• A4 फॉर्मेट, 1-इंच मार्जिन, रियल टर्मिनल स्क्रीनशॉट्स`
    : `✅ **Your Assignment Document is ready!**\n\n` +
      `📄 **File**: \`${session.filename}\`\n` +
      `• Student: ${session.header.studentName} (${session.header.rollNo})\n` +
      `• Subject: ${session.header.subject}\n` +
      `• A4 Layout, 1-inch margins, Consolas code blocks, authentic terminal screenshots.`;

  const followUpKeyboard = new InlineKeyboard()
    .text(isHindi ? '📄 PDF वर्शन भेजें' : '📄 Also Send PDF', 'followup_pdf')
    .row()
    .text(isHindi ? '🖼️ स्क्रीनशॉट्स फोटो के रूप में' : '🖼️ Send Screenshots as Images', 'followup_images')
    .row()
    .text(isHindi ? '✍️ हस्तलिखित (Handwritten) PDF' : '✍️ Handwritten Version (PDF)', 'followup_handwriting')
    .row()
    .text(isHindi ? '🔄 टर्मिनल लोकेशन बदलें' : '🔄 Change Terminal Location', 'followup_change_prompt');

  await ctx.replyWithDocument(new InputFile(docxBuffer, session.filename), {
    caption,
    parse_mode: 'Markdown',
    reply_markup: followUpKeyboard,
  });
}

// ============================================================================
// Follow-Up Actions (PDF, Screenshot Images, Handwritten)
// ============================================================================

async function sendPdfFollowup(ctx: any) {
  const session = getSession(ctx.chat.id);
  if (!session.generatedPdfBuffer) {
    await ctx.reply('⚠️ PDF not available. Please generate the assignment first.');
    return;
  }
  const pdfFilename = session.filename.replace(/\.docx$/i, '.pdf');
  await ctx.replyWithDocument(new InputFile(session.generatedPdfBuffer, pdfFilename), {
    caption: `📄 **Assignment PDF Submission** (${pdfFilename})`,
    parse_mode: 'Markdown',
  });
}

async function sendScreenshotsFollowup(ctx: any) {
  const session = getSession(ctx.chat.id);
  if (!session.screenshots || session.screenshots.length === 0) {
    await ctx.reply('⚠️ No execution screenshots available in this assignment.');
    return;
  }

  await ctx.reply(`🖼️ Sending ${session.screenshots.length} terminal execution screenshots:`);
  for (const ss of session.screenshots) {
    await ctx.replyWithPhoto(new InputFile(ss.buffer, `${ss.label}-screenshot.png`), {
      caption: `🖥️ **${ss.label} Execution Output** [Prompt: \`${session.promptLocation}\`]`,
      parse_mode: 'Markdown',
    });
  }
}

async function sendHandwritingFollowup(ctx: any) {
  const session = getSession(ctx.chat.id);
  await ctx.reply('✍️ Rendering realistic handwritten PDF with ruled notebook paper and ink styling...');

  const handwrittenPdfBuffer = await generateServerAssignmentPdf({
    header: session.header,
    questions: session.questions.map((q) => ({
      id: q.id,
      numberLabel: q.numberLabel,
      questionText: q.text,
      codeSnippet: q.codeSnippet,
      codeLanguage: q.codeLanguage || session.language,
      explanation: q.explanation,
    })),
    screenshots: session.screenshots,
    isHandwritten: true,
  });

  const hwFilename = session.filename.replace(/\.docx$/i, '_Handwritten.pdf');
  await ctx.replyWithDocument(new InputFile(handwrittenPdfBuffer, hwFilename), {
    caption: `✍️ **Handwritten Assignment Submission** (${hwFilename})\nRendered with ruled notebook paper & deterministic handwriting styling.`,
    parse_mode: 'Markdown',
  });
}

// ============================================================================
// Settings UI
// ============================================================================

async function renderSettingsView(ctx: any) {
  const chatId = ctx.chat.id;
  const prefs = getUserPreferences(chatId);

  const text =
    `⚙️ **Saved Student Settings & Preferences**\n\n` +
    `• **Name**: ${prefs.name || 'Not set (Default: Ajeet Kumar)'}\n` +
    `• **Roll No**: ${prefs.rollNo || 'Not set (Default: 22BCS1045)'}\n` +
    `• **Course**: ${prefs.course || 'Not set (Default: B.Tech CSE)'}\n` +
    `• **Subject**: ${prefs.subject || 'Not set (Default: DBMS)'}\n` +
    `• **Terminal Style**: ${(prefs.defaultTerminalStyle || 'vscode').toUpperCase()}\n` +
    `• **Default Prompt**: \`${prefs.defaultPromptLocation || 'PS D:\\ajeet\\program\\DBMS>'}\`\n\n` +
    `_These settings are saved for your chat ID and automatically pre-filled in your assignments._`;

  const keyboard = new InlineKeyboard().text('✨ Start New Assignment (/new)', 'action_new');

  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
}
