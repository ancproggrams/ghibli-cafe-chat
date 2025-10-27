# Ghibli Café Chat ☕

A warm Studio Ghibli-inspired café chat application featuring atmospheric time-of-day modes and cozy conversations.

![Ghibli Café Chat](public/og-image.png)

## ✨ Features

### 🎨 Time-of-Day Atmospheric Modes
- **Day Mode**: Bright, warm natural sunlight filtering through café windows
- **Evening Mode**: Golden hour ambiance with warm orange and amber tones
- **Night Mode**: Cozy interior lighting with starlit windows and deep blue atmosphere

### 🖼️ Immersive Café Scenes
- Beautiful Studio Ghibli-style artwork featuring people enjoying peaceful moments
- Dynamic scene switching based on time of day
- Left panel: Cozy café corner with window seating
- Right panel: Reading nook with bookshelves

### 💬 Chat Interface
- Clean, minimalist chat interface
- Model selection with dropdowns (Gaijin A & Gaijin B)
- Animated typing indicators
- Message bubbles with timestamps
- Auto-scroll to latest messages

### 🎯 Design Philosophy
- Warm, inviting color palettes
- Smooth transitions and animations
- Accessible and responsive design
- Studio Ghibli aesthetic throughout

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ancproggrams/ghibli-cafe-chat.git
cd ghibli-cafe-chat
```

2. Install dependencies:
```bash
yarn install
```

3. Run the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
yarn build
yarn start
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: shadcn/ui
- **State Management**: React Context API
- **Image Optimization**: Next.js Image component

## 📁 Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with TimeProvider
│   ├── page.tsx            # Main chat page
│   └── globals.css         # Global styles & time-based themes
├── components/
│   ├── auralynx-chat.tsx   # Main chat component
│   ├── chat-interface.tsx  # Chat display & controls
│   ├── robot-panel.tsx     # Side café panels
│   ├── top-navigation.tsx  # Header with time toggle
│   ├── time-context.tsx    # Time-of-day state management
│   ├── time-toggle.tsx     # Time switching buttons
│   └── ui/                 # shadcn/ui components
├── public/
│   ├── ghibli_cafe_corner_person*.jpg       # Left panel images
│   ├── ghibli_cafe_seating_person*.jpg      # Right panel images
│   └── favicon.svg         # Café icon
└── lib/
    ├── utils.ts            # Utility functions
    └── types.ts            # TypeScript types
```

## 🎨 Customization

### Changing Color Themes
Edit the CSS variables in `app/globals.css`:

```css
/* Day Mode */
body[data-time="day"] {
  --bg-main: #f4e5d3;
  --text-primary: #2c1810;
  /* ... more variables ... */
}

/* Evening Mode */
body[data-time="evening"] {
  --bg-main: #f5e6d3;
  --accent-primary: #d4895c;
  /* ... more variables ... */
}

/* Night Mode */
body[data-time="night"] {
  --bg-main: #2c3e50;
  --accent-primary: #e8b86d;
  /* ... more variables ... */
}
```

### Adding New Café Images
1. Generate or create 16:9 aspect ratio images
2. Place them in the `public/` directory
3. Update the `getImageSrc()` function in `components/robot-panel.tsx`

## 🌟 Features Coming Soon

- [ ] Real AI model integration
- [ ] Conversation history
- [ ] Save/export conversations
- [ ] More café scenes
- [ ] Sound effects and ambient music
- [ ] Mobile responsive improvements

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/ancproggrams/ghibli-cafe-chat/issues).

## 💖 Acknowledgments

- Inspired by Studio Ghibli's warm and cozy aesthetic
- Built with love for peaceful conversations
- Special thanks to the Next.js and React communities

---

**Enjoy your stay at the Ghibli Café! ☕✨**
