# Contributing to Ectoplasm DEX

Thank you for your interest in contributing to Ectoplasm DEX! We welcome contributions from the community to help improve this decentralized exchange on the Casper Network.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Security](#security)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

### Our Standards

- **Be respectful**: Treat everyone with respect and consideration
- **Be collaborative**: Work together to achieve common goals
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different skill levels and backgrounds

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Git**
- A **Casper wallet** (CasperWallet extension or CSPR.click account) for testing

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ectoplasm-react.git
   cd ectoplasm-react
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/ectoplasm-react.git
   ```

### Install Dependencies

```bash
npm install
```

### Set Up Environment

Create a `.env` file in the project root:

```env
# Optional: CSPR.cloud API key for Odra contract balance queries
VITE_CSPR_CLOUD_API_KEY=your_api_key_here
```

### Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the [coding standards](#coding-standards)
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Build the project
npm run build

# Preview production build
npm run preview
```

Test your changes thoroughly:
- Test on both **Testnet** and **Mainnet** (if applicable)
- Test with different wallet providers (CasperWallet, CSPR.click)
- Test both **Native** and **Odra** contract versions
- Verify responsive design on different screen sizes

### 4. Commit Your Changes

Follow our [commit guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat: add new token swap feature"
```

### 5. Keep Your Branch Updated

Regularly sync with the upstream repository:

```bash
git fetch upstream
git rebase upstream/main
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

## Coding Standards

### TypeScript

- Use **TypeScript** for all new code
- Define proper types and interfaces
- Avoid using `any` type unless absolutely necessary
- Use meaningful variable and function names

**Example:**
```typescript
// Good
interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
}

// Avoid
let data: any;
```

### React

- Use **functional components** with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types

**Example:**
```typescript
interface SwapFormProps {
  fromToken: Token;
  toToken: Token;
  onSwap: (amount: string) => Promise<void>;
}

export const SwapForm: React.FC<SwapFormProps> = ({ fromToken, toToken, onSwap }) => {
  // Component logic
};
```

### File Organization

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Shared components (Header, Footer, etc.)
│   └── [feature]/    # Feature-specific components
├── config/           # Configuration files
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # API and blockchain services
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Styling

- Use **CSS modules** or **styled-components** for component-specific styles
- Follow existing design patterns and theme
- Ensure responsive design (mobile, tablet, desktop)
- Support both light and dark themes

### Code Formatting

We use ESLint for code quality. Run the linter before committing:

```bash
npm run lint
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Examples

```bash
# Feature
git commit -m "feat(swap): add slippage tolerance setting"

# Bug fix
git commit -m "fix(wallet): resolve balance refresh issue"

# Documentation
git commit -m "docs: update installation instructions"

# Breaking change
git commit -m "feat(api)!: change token balance response format

BREAKING CHANGE: Token balance API now returns BigInt instead of string"
```

## Pull Request Process

### Before Submitting

1. ✅ **Test your changes** thoroughly
2. ✅ **Run the linter**: `npm run lint`
3. ✅ **Build successfully**: `npm run build`
4. ✅ **Update documentation** if needed
5. ✅ **Rebase on latest main** branch

### Submitting a Pull Request

1. **Push your branch** to your fork
2. **Open a Pull Request** on GitHub
3. **Fill out the PR template** completely
4. **Link related issues** (e.g., "Closes #123")

### PR Title Format

Use the same format as commit messages:

```
feat(swap): add multi-hop routing support
fix(liquidity): correct LP token calculation
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Tested on Testnet
- [ ] Tested with CasperWallet
- [ ] Tested with CSPR.click
- [ ] Tested Native contracts
- [ ] Tested Odra contracts
- [ ] Tested responsive design

## Screenshots (if applicable)
Add screenshots or GIFs demonstrating the changes.

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings or errors
- [ ] I have tested my changes thoroughly
```

### Review Process

- At least **one maintainer approval** is required
- Address all review comments
- Keep the PR focused on a single concern
- Be responsive to feedback

## Testing

### Manual Testing Checklist

When testing your changes, verify:

#### Wallet Integration
- [ ] Connect with CasperWallet extension
- [ ] Connect with CSPR.click
- [ ] Wallet disconnection works properly
- [ ] Balance updates correctly

#### Token Swaps
- [ ] Swap executes successfully
- [ ] Slippage tolerance is respected
- [ ] Price impact is calculated correctly
- [ ] Transaction status updates properly

#### Liquidity
- [ ] Add liquidity works for both tokens
- [ ] Remove liquidity returns correct amounts
- [ ] LP token balance updates

#### Liquid Staking
- [ ] Stake CSPR for sCSPR
- [ ] Unstake sCSPR for CSPR
- [ ] Rewards calculation is accurate

#### UI/UX
- [ ] Responsive on mobile, tablet, and desktop
- [ ] Dark/light theme toggle works
- [ ] Loading states display correctly
- [ ] Error messages are clear and helpful

### Network Testing

Test on both networks:
- **Testnet**: For development and testing
- **Mainnet**: For production-ready features (with caution)

## Security

### Reporting Security Vulnerabilities

**Do not** open public issues for security vulnerabilities.

Instead, please email security concerns to: **[security@ectoplasm.example.com]**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Best Practices

When contributing:
- Never commit private keys, mnemonics, or API keys
- Validate all user inputs
- Use proper error handling
- Follow secure coding practices for blockchain interactions
- Be cautious with external dependencies

### Dependency Security

We use npm's security features:
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: [Join our Discord server] (if applicable)

### Ways to Contribute

Not all contributions are code! You can also help by:

- 📝 **Improving documentation**
- 🐛 **Reporting bugs**
- 💡 **Suggesting features**
- 🎨 **Improving UI/UX**
- 🧪 **Testing new features**
- 📢 **Spreading the word**

### Recognition

Contributors will be recognized in:
- The project's README
- Release notes
- Our community channels

## Questions?

If you have questions about contributing, feel free to:
- Open a [GitHub Discussion](https://github.com/OWNER/ectoplasm-react/discussions)
- Reach out on Discord
- Comment on relevant issues

---

**Thank you for contributing to Ectoplasm DEX!** 🚀

Your contributions help make decentralized finance more accessible on the Casper Network.
