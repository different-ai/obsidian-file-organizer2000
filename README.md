# Note Companion AI (prev. File Organizer 2000)

Note Companion is an AI-powered Obsidian plugin that automatically organizes and formats your notes—so you don't have to. It helps you maintain a clean and well-structured knowledge base.

<p>
  <a href="https://fileorganizer2000.com/"><img src="https://img.shields.io/badge/Try-Note%20Companion-7852ee?style=flat&logoColor=white" alt="Try Note Companion"></a>
  <a href="https://youtube.com/playlist?list=PLgRcC-DFR5jcwwg0Dr3gNZrkZxkztraKE&si=ZCn2ndFz-zN2cfML"><img src="https://img.shields.io/youtube/channel/subscribers/UCd24YzGlvtIG4DYD3zlYLwg?label=YouTube&color=34d399&style=flat&logo=youtube&logoColor=white" alt="YouTube Subscribers"></a>
</p>

## 🌟 Features

- 🗂️ **Organizing Suggestions**: Get AI-driven suggestions for folders, tags, filenames, and more.
- 🎛️ **Custom Format AI Prompts**: Save and apply your own AI prompts for consistency.
- 📁 **Automated Workflows**: Streamline your file management and formatting tasks.
- 📖 **Handwritten Note Digitization**: Convert handwritten notes into searchable digital text.
- 🔊 **Audio Transcription**: Easily transcribe and organize audio files.
- ✂️ **Atomic Note Generation**: Break down larger notes into smaller, more focused ones.
- 🎥 **YouTube Summaries**: Quickly generate summaries for YouTube videos.
- 💬 **Context-Aware AI Chat**: Use AI to chat with multiple notes in context.


![Group 39904](https://github.com/user-attachments/assets/ccb7203f-a1dc-45e9-8fb0-6c6b986bf6aa)
![Group 39905](https://github.com/user-attachments/assets/2b7334b3-33f3-414e-9e2e-cc7720f17f68)
![Group 39906](https://github.com/user-attachments/assets/389d1f1d-19c8-4a9b-adfa-eeba86df0aff)
![Group 39907](https://github.com/user-attachments/assets/591d7370-777c-418b-9970-f6809437c2de)
![Group 39908](https://github.com/user-attachments/assets/07b0a7b5-1da5-4f9b-8cc3-dc4ab52f1338)

---

## 🗄️ Key Use Cases

### Smart Vault Management
Transform your Obsidian vault into an intelligent knowledge base:
1. **Context-Aware Organization**: AI suggests tags, folders, and filenames based on content.
2. **Powerful Search**: Natural language search across files, including YouTube transcripts.
3. **Automation Tools**:
   - `LastModifiedHandler`: Track and organize recently modified files.
   - `ScreenpipeHandler`: Monitor daily activities.
   - `ExecuteActionsHandler`: Automate repetitive tasks.

### Handwritten Notes Digitization
- **Advanced OCR Integration**: Convert handwritten notes and diagrams into digital text.
- **Batch Processing**: Automate organization for multiple notes at once.
- **Diagram Recognition**: Preserve and process hand-drawn diagrams.

### Intelligent Meeting Notes
- **Granola-Style Notes**: Automatically create structured and actionable meeting notes.
- **Smart Transcript Integration**: Merge meeting transcripts with existing notes.
- **Customizable Templates**: Ensure consistent formatting for all notes.

---

## 🚀 Getting Started

Choose your preferred setup:

### A. Cloud Subscription
1. Access our managed service with all features included
2. No setup required - just activate your license key
3. Regular updates and new features

### B. Self-Hosted Solution
1. Run your own instance with full control
2. Use your preferred AI models
3. Complete privacy with local processing

1. Run the server
   For Linux/macOS:
   ```sh
   cd packages/web && pnpm build:self-host && pnpm start
   ```
   And make sure you have your `OPENAI_API_KEY` variable set up in your `.env.local` file inside the `packages/web` directory. If you want to use Amazon Bedrock models, you'll also need to configure AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
   For Windows (PowerShell):
   ```sh
   cd packages/web; pnpm build:self-host; pnpm start
   ```
   And make sure you have your `OPENAI_API_KEY` variable set up in your `.env.local` file inside the `packages/web` directory.
2. Enable self-hosted mode in plugin settings:
   <img width="707" alt="Screenshot 2024-04-13 at 07 16 21" src="https://github.com/different-ai/file-organizer-2000/assets/11430621/ca2222c9-cb8d-4d15-8459-2da4c9662f24">
### C. Development Setup
This is a monorepo using pnpm workspaces and Turborepo. To get started:
1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Build all packages:
   ```sh
   pnpm build
   ```
3. Development commands:
   - Start web development server: `cd packages/web && pnpm dev`
   - Build plugin: `cd packages/plugin && pnpm build`
   - Build audio server: `cd packages/audio-server && pnpm build`
The project consists of the following packages:
- `packages/plugin`: The Obsidian plugin
- `packages/web`: The web application
- `packages/audio-server`: Audio transcription server
- `packages/shared`: Shared utilities and types
For the tech-savvies who would like to play around with different models, there is a promptfoo.yaml file in the project including examples with local LLMs.
See link for more info: https://promptfoo.dev/docs/configuration/guide/



## 📱 Mobile Integration

Seamlessly integrate with your mobile workflow:
- iOS Shortcut for sending Apple Notes to Obsidian
- Voice memo support for instant meeting notes
- Cloud sync compatibility (works great with iCloud)

## iOS shortcut to send Apple Notes and Audios to Obsidian
The iOS shortcut below makes it easy for you to easily work from your phone with this plugin.
https://www.icloud.com/shortcuts/06915768862848fb9711f2f19b6405e2
how to set it up: https://youtu.be/zWJgIRlDWkk?si=HSeOUKaMfJvaLtKI

Notes:
- It works when your vault is on a cloud drive. I use it with iCloud and works great. Doesn't work with OneDrive last time I tested.
- Currently only works if your iOS is in English. But if you reach out on discord I can help you set it up in your language.


## 🛠️ Advanced Features

### Custom AI Templates
Create powerful automation workflows:
- Define custom processing rules
- Set up automatic file naming conventions
- Configure content formatting templates

### Multi-Modal Support
Process various types of content:
- Audio transcription
- Image OCR
- PDF text extraction
- YouTube video transcripts



## Tips and Tricks

[![Thumbnail (2)](https://github.com/different-ai/file-organizer-2000/assets/11430621/1b2c524b-11bc-484d-9255-4699783303bf)](https://youtube.com/playlist?list=PLgRcC-DFR5jcwwg0Dr3gNZrkZxkztraKE&si=FozzANIO6i8XI_x8)

## How to use

### A. AI Organizer

Get suggestions and choose what to apply with the Assistant view. Here's how to use it:

1. Click on the Assistant View Icon or set up the "Show Assistant" hotkey to open the Sidebar
2. Select any of your files and choose which changes to apply

<img width="1277" alt="Screenshot 2024-05-24 at 11 42 17 PM" src="https://github.com/different-ai/file-organizer-2000/assets/46509400/dc06a61f-64d0-4e10-898d-3e0330004e94">

### B. AI Inbox

Auto-organize with the AI Inbox.

We recommend the AI Assistant view for more control. But the AI Inbox can be handy as well. Simply move any of your files to the "Inbox" folder and the plugin will automatically move it to the folder it belongs. Additional configuration can also be specified within the plugin settings (e.g. auto-tagging, auto-formatting).

Move your unorganized files into `_FileOrganizer2000/Inbox`

![image](https://github.com/different-ai/file-organizer-2000/assets/11430621/295038f0-170c-456e-8e0a-e89c31719b95)

It takes a sec, and then renames, and organizes your file.

![image](https://github.com/different-ai/file-organizer-2000/assets/11430621/f9fd716f-6ada-45c4-bd59-a4efcd79b0e5)

See plugin settings to customize the changes AI Inbox applies to your files.

### C. Create custom AI Templates

Give instructions for the AI to format and modify your files.

See video: https://www.youtube.com/watch?v=rommuUXRgUw&t=17s

### D. Misc

To use llama 3.2 with the ai chat, install Ollama + llama 3.2 and check this setting in the plugin:

<img width="751" alt="Screenshot 2024-10-26 at 7 34 18 PM" src="https://github.com/user-attachments/assets/95add737-9cd5-4cb4-a360-ff5fc95ebfa7">

