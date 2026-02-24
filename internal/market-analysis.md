# Market Analysis: Marp and Slidev Documentation

## Executive Summary

This analysis examines the documentation structures of Marp and Slidev, two established Markdown-based presentation tools. The goal is to identify best practices for organizing tycoslide documentation.

## Marp Documentation Analysis

### Overview
- **Website**: https://marp.app/
- **Documentation**: https://marpit.marp.app/
- **Focus**: Markdown presentation ecosystem with multiple output formats (HTML, PDF, PPTX via LibreOffice)

### Documentation Structure

#### 1. Organization & Hierarchy
**Main Sections:**
- **Introduction** - Landing page with feature overview
- **Getting Started**
  - Installation
  - How to use (basic usage)
- **Usage** - Core functionality
  - Marpit Markdown (syntax guide)
  - Directives (configuration)
  - Image syntax
  - Fragmented list
  - Theme CSS
  - Inline SVG slide
- **Marpit API** - JSDoc-generated API reference
- **Additional Resources**
  - GitHub repository
  - npm package

#### 2. Content Organization Patterns

**Progressive Disclosure:**
- Homepage focuses on value proposition and features
- "Get started!" CTA prominently displayed
- Deep technical details separated into dedicated sections

**Logical Grouping:**
- User-facing features first (Markdown syntax, directives)
- Customization/theming next (Theme CSS)
- Advanced features last (Inline SVG, API)

#### 3. Key Documentation Topics

**Syntax & Basic Usage:**
- Slide separators (`---`)
- Directives (frontmatter and HTML comments)
  - Global directives (theme, headingDivider)
  - Local directives (paginate, header, footer, class, backgroundColor)
- Image syntax with advanced features
  - Resizing (keywords, percentage, length)
  - Image filters
  - Background images with size controls
  - Multiple backgrounds
  - Split backgrounds

**Theming & Customization:**
- HTML structure explanation
- Creating theme CSS
- `:root` pseudo-class selector usage
- Theme metadata
- Slide sizing
- Pagination customization
- Header/footer customization
- Custom directives

**Code Examples:**
- Every feature has inline code examples
- Copy buttons for all code blocks
- Progressive examples (simple → complex)

#### 4. Navigation & UX

**Sidebar Navigation:**
- Persistent left sidebar with hierarchical structure
- Clear visual separation of sections
- "PREVIOUS/NEXT" links at bottom of each page

**Search & Discovery:**
- Links to related topics within content
- Cross-references between related features
- External links to GitHub and npm

#### 5. Documentation Style

**Technical but Accessible:**
- Assumes basic Markdown knowledge
- Explains concepts with working examples
- Uses diagrams/images to illustrate concepts
- Links to external resources (CommonMark, CSS specs)

**Code-First Approach:**
- Shows code examples immediately
- Minimal prose, maximum examples
- Each feature demonstrated with copy-paste ready code

---

## Slidev Documentation Analysis

### Overview
- **Website**: https://sli.dev/
- **Focus**: Developer-focused presentation framework built on Vue, Vite, and UnoCSS
- **Output**: Web-based presentations with PDF export

### Documentation Structure

#### 1. Organization & Hierarchy

**Top-Level Menu Structure:**
- **📖 Guide** (User-focused tutorials)
  - Why Slidev
  - Getting Started
  - Syntax Guide
  - User Interface
  - Animations
  - Theme & Addons
  - Components
  - Layouts
  - Exporting
  - Hosting
  - Work with AI
  - FAQ
  - **Advanced** (subsection)
    - Global Context
    - Writing Layouts
    - Writing Themes
    - Writing Addons

- **Reference** (API & Configuration)
  - CLI
  - Components
  - Layouts
  - Configurations
  - Directory Structure
  - Configure [Tool] (12+ configuration guides)

- **Resources**
  - Showcases
  - Theme Gallery
  - Addon Gallery
  - Learning Resources
  - Curated Covers
  - Release Notes

#### 2. Content Organization Patterns

**User Journey Based:**
- "Why" → "Getting Started" → "Syntax" → "Advanced Topics"
- Clear separation between learning path and reference material
- Community resources as separate top-level section

**Feature Tags:**
- Uses emoji tags to categorize features (✨ for features)
- Tags include: Syntax, Codeblock, Animation, Editor, Presenter, Diagram, Styling, Layout

**Modular Structure:**
- Each feature/topic is self-contained
- Can be read in any order after Getting Started
- Heavy use of cross-linking

#### 3. Key Documentation Topics

**Getting Started:**
- Try it Online (immediate hands-on)
- Create Locally (installation)
- Basic Commands (CLI)
- Setup Your Editor (tooling)
- Join the Community
- Tech Stack (transparency)

**Syntax Guide (Comprehensive):**
- Slide Separators
- Frontmatter & Headmatter (YAML config)
- Notes (presenter notes)
- Code Blocks (extensive features)
  - Line numbers
  - Max height
  - Line highlighting
  - Monaco editor integration
  - Monaco runner (live execution)
  - Writable editor
  - Shiki Magic Move (transitions)
  - TwoSlash integration
  - Import code snippets
  - Code groups
- LaTeX blocks
- Diagrams (Mermaid, PlantUML)
- MDC Syntax (component styling)
- Scoped CSS
- Importing slides

**Customization (Deep Dive):**
- Multiple "Configure X" pages for each tool
- Directory Structure explanation
- Per-slide vs deck-level configs
- Advanced customization for power users

**Components & Layouts:**
- Built-in components reference
- Built-in layouts gallery
- How to create custom components/layouts

#### 4. Navigation & UX

**Multi-Level Sidebar:**
- Collapsible sections
- Visual hierarchy with indentation
- Active page highlighted
- Previous/Next navigation at bottom

**Search:**
- Prominent search bar at top
- Quick access to all documentation

**Visual Design:**
- Clean, modern design
- Dark/light mode toggle
- Emoji icons for visual scanning
- Feature badges throughout

**Interactive Elements:**
- Code blocks with copy buttons
- Live examples where applicable
- Links to online playground

#### 5. Documentation Style

**Developer-Centric:**
- Assumes familiarity with modern web dev tools
- Technical but well-explained
- Focus on configuration and customization

**Example-Rich:**
- Every feature shown with code examples
- Multiple examples for complex features
- Real-world use cases

**Progressive Depth:**
- Basic features upfront
- Advanced topics clearly separated
- Configuration details in dedicated sections

---

## Best Practices to Adopt for tycoslide

### 1. Documentation Structure

**Recommended Hierarchy:**

```
Getting Started
├── Why tycoslide?
├── Installation
├── Quick Start (Your First Presentation)
└── Basic Commands

Guide
├── Markdown Syntax
│   ├── Slide Separators
│   ├── Frontmatter Configuration
│   ├── Text Formatting
│   ├── Lists & Tables
│   ├── Images
│   └── Code Blocks
├── Slide Layouts
│   ├── Title Slide
│   ├── Section Header
│   ├── Content Layouts
│   ├── Two Column
│   └── Custom Layouts
├── Styling & Themes
│   ├── Built-in Themes
│   ├── Custom Themes
│   ├── Colors & Fonts
│   └── Per-Slide Styling
└── Advanced Features
    ├── Speaker Notes
    ├── Slide Numbers & Footers
    ├── Animations & Transitions
    └── Master Slides

Reference
├── CLI Reference
├── Configuration Options
├── Frontmatter Reference
├── Layout Reference
└── Theme API

Resources
├── Examples & Templates
├── Troubleshooting
├── FAQ
└── Changelog
```

### 2. Content Organization Best Practices

**From Marp:**
- **Code-first approach**: Show working examples immediately
- **Progressive examples**: Start simple, build to complex
- **Copy-paste ready**: Every example should be runnable
- **Minimal prose**: Let code speak, explain when needed
- **Visual separation**: Clear distinction between feature categories

**From Slidev:**
- **User journey structure**: Why → How → Advanced → Reference
- **Feature tagging**: Categorize with visual indicators
- **Separation of concerns**: Guide vs Reference vs Resources
- **Comprehensive configuration docs**: Dedicated pages for each major feature
- **Interactive elements**: Try it online, playgrounds, live examples

### 3. Key Topics to Cover

**Essential (Priority 1):**
1. **Quick Start Guide**
   - Installation (npm/yarn/pnpm)
   - First presentation in 5 minutes
   - Basic Markdown syntax overview
   - Running the CLI

2. **Markdown Syntax**
   - How to separate slides
   - Frontmatter configuration (per-slide and deck-level)
   - Text formatting
   - Lists and tables
   - Images (inline, backgrounds)
   - Code blocks with syntax highlighting

3. **Layouts**
   - What layouts are available
   - How to specify layouts
   - Layout-specific options
   - Visual gallery of layouts

4. **Styling**
   - Theme selection
   - Color customization
   - Font customization
   - Per-slide styling

5. **CLI Reference**
   - All commands with examples
   - Common options
   - Configuration file

**Important (Priority 2):**
6. **Advanced Features**
   - Speaker notes
   - Slide numbers and footers
   - Custom themes
   - Master slide customization

7. **Configuration**
   - Config file format
   - All available options
   - Default values
   - Examples for common scenarios

8. **Troubleshooting**
   - Common errors and solutions
   - Known limitations
   - Workarounds

**Nice to Have (Priority 3):**
9. **Examples & Templates**
   - Complete presentation examples
   - Template gallery
   - Use case demonstrations

10. **API Reference** (if programmatic usage is supported)
    - JavaScript API
    - Plugin system (if applicable)

### 4. What's NOT Relevant

**From Marp (Web-specific):**
- Inline SVG slide rendering
- HTML conversion details
- Bespoke.js integration
- Browser-specific features

**From Slidev (Framework-specific):**
- Vue component integration
- Vite configuration
- UnoCSS setup
- Monaco editor integration
- Live code execution
- View Transition API
- WebDriver BiDi
- Directory structure (for Vue projects)

### 5. Documentation Style Guidelines

**Tone & Voice:**
- Friendly but professional
- Assumes basic Markdown knowledge
- Explains PowerPoint-specific concepts clearly
- Don't assume familiarity with other presentation tools

**Structure for Each Page:**
```markdown
# Feature Name

Brief description (1-2 sentences)

## Basic Usage

Simple example with minimal configuration

## Options

Detailed explanation of available options

## Examples

Multiple real-world examples showing different use cases

## Related

Links to related features/pages
```

**Code Examples:**
- Always show complete, runnable examples
- Include frontmatter when relevant
- Add copy buttons
- Show both input (Markdown) and output (what appears in PowerPoint)
- Use syntax highlighting
- Comment complex examples

**Visual Elements:**
- Screenshots of actual PowerPoint output
- Side-by-side Markdown → PowerPoint comparisons
- Diagrams for complex concepts
- Icons/emojis for visual scanning (sparingly)

### 6. Navigation Best Practices

**Must Have:**
- Persistent sidebar navigation
- Search functionality
- Breadcrumb navigation
- Previous/Next page links
- Table of contents for long pages
- "Jump to section" links on landing pages

**Nice to Have:**
- Dark/light mode toggle
- Mobile-responsive design
- Keyboard shortcuts for navigation
- Recently viewed pages

### 7. Interactive Elements

**High Value:**
- Online playground or demo (if possible)
- Copy buttons for all code examples
- Downloadable example presentations
- Interactive configuration builder

**Medium Value:**
- Embedded video tutorials
- Animated GIFs showing features
- Interactive feature comparison table

### 8. Getting Started Experience

**Critical Path (5 minutes to first presentation):**

1. **Installation** (1 minute)
   ```bash
   npm install -g tycoslide
   ```

2. **Create first presentation** (2 minutes)
   ```bash
   tycoslide init my-presentation
   cd my-presentation
   # Show what files were created
   ```

3. **Edit and preview** (2 minutes)
   ```markdown
   # Edit slides.md
   # Show minimal example with 3 slides
   ```

4. **Generate PowerPoint**
   ```bash
   tycoslide build slides.md
   # Open presentation.pptx
   ```

**Then guide to:**
- Exploring layouts
- Trying themes
- Adding images
- Customizing styles

### 9. Key Differentiators to Highlight

Since tycoslide generates PowerPoint (not web slides), emphasize:

1. **PowerPoint-native features**
   - Uses actual PowerPoint layouts, not CSS approximations
   - Full compatibility with PowerPoint/Keynote/LibreOffice
   - Edit generated files in PowerPoint
   - Corporate template integration

2. **Offline editing**
   - No web server needed
   - Works completely offline
   - Version control friendly

3. **Familiar output**
   - Recipients don't need special tools
   - Works in any environment that supports PPTX
   - Easy sharing and collaboration

### 10. Documentation Anti-Patterns to Avoid

**From Analysis:**
- Don't bury installation instructions
- Don't assume users know related tools (Markdown-it, etc.)
- Don't document implementation details users don't need
- Don't use jargon without explanation
- Don't create orphan pages with no navigation
- Don't skip error messages/troubleshooting
- Don't forget to update examples when features change

### 11. Maintenance Considerations

**Version Documentation:**
- Clearly show which version docs apply to
- Changelog with upgrade guides
- Deprecation warnings
- Migration guides for breaking changes

**Keep Current:**
- Examples that match current CLI output
- Screenshots from latest version
- Updated configuration options
- Working code samples

---

## Conclusion

Both Marp and Slidev excel at:
- **Clear information architecture** with logical grouping
- **Code-first documentation** with abundant examples
- **Progressive disclosure** from simple to advanced
- **Strong navigation** with persistent sidebars and cross-linking
- **Visual hierarchy** making content scannable

For tycoslide, the recommended approach is:
1. Adopt Slidev's **user journey structure** (Guide → Reference → Resources)
2. Use Marp's **code-first style** with immediate, copy-paste examples
3. Create a **5-minute quick start** path
4. Separate **learning material** from **reference material**
5. Emphasize **PowerPoint-specific advantages**
6. Include **visual examples** showing Markdown → PowerPoint conversion
7. Build comprehensive **configuration reference** for power users
8. Maintain **clear upgrade paths** with versioned docs

The documentation should serve both beginners (who want quick results) and power users (who need comprehensive configuration options), with clear navigation between these two audiences.
