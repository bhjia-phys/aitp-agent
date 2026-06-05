/**
 * Welcome panel shown at the top of the TUI.
 * Renders a round-bordered box with the Hakimi pixel ship, session, model, and version.
 */

import type { Component } from '@earendil-works/pi-tui';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import chalk from 'chalk';

import { isRainbowDancing, renderDanceWelcomeHeader } from '#/tui/easter-eggs/dance';
import type { ColorPalette } from '#/tui/theme/colors';
import type { AppState } from '#/tui/types';

const HAKIMI_TAGLINE = 'truth-seeking physics research agent';
const HAKIMI_READY_LINE = 'Ready to explore the frontiers of physics knowledge.';

const HAKIMI_LOGO_COLORS = {
  B: '#1F8DFF',
  C: '#28D7FF',
  D: '#2759C7',
  E: '#F6F2E3',
  G: '#FFD45C',
  O: '#FF9D2E',
  S: '#9AA7B6',
  W: '#DDE7F3',
} as const;

type HakimiLogoColorKey = keyof typeof HAKIMI_LOGO_COLORS;

const HAKIMI_PIXEL_LOGO = [
  '............................................',
  '....................E.......................',
  '...................ESE......................',
  '...................ESO................E.....',
  '..................ESOOE..............EE.....',
  '..................ESOOOE............EOE.....',
  '.................ESOOOOE...........EOOE.....',
  '.................ESSSEEEEEEEEEE...EOOOE.....',
  '................EEEEEDDDWWWWWWWEEEEOOOE.....',
  '...............EECWWWDDDWWWEEEEEEEWEEOE.....',
  '..............CCCCWWWDDDWEEEEECCCBEEWEE.....',
  '............EEWCCCCWWWWWEBEEEECCCCCBEEE.....',
  '.........EEEEWOOOOOOWWWWEEEEECCCCCCBEWWEEEEE',
  '.......EESSSEWOOOOOEEEWWWEEBCCCCCBEEWWWWWEE.',
  '........ESSSEWOOOOEOOOEEWWWEEEEEEEWWDWWEE...',
  '........EOOOOSWWEOOGGGOOEWWWWWWWWDDDESE.....',
  '........BESOEESSEOGGGGGOEWWWWDDDDDDDSE......',
  '......BCCCEECEEEEOGGGGGOESDDDDDDDDDSE.......',
  '....BCCCCCCEEE..EOGGGGGOESDDDDDDDDDS........',
  '..BBBCCCC.EEE....EEGGGEESDDDDDSSSSS.........',
  '..BBBCCCEEEE.......EEE...DSDDDDE............',
  '..BBCC....E.............EEEESSSE............',
  '.BB.C.......................EEE.............',
  '.B..........................................',
] as const;

function padAnsi(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - visibleWidth(text)));
}

function renderHakimiPixelLogo(): string[] {
  return HAKIMI_PIXEL_LOGO.map((row) =>
    Array.from(row)
      .map((pixel) => {
        if (pixel === '.') return ' ';
        return chalk.hex(HAKIMI_LOGO_COLORS[pixel as HakimiLogoColorKey])('█');
      })
      .join(''),
  );
}

function renderHakimiTextBlock(colors: ColorPalette): string[] {
  const dim = chalk.hex(colors.textDim);
  return [
    chalk.bold.hex(colors.primary)('Hakimi'),
    chalk.hex(colors.accent)(HAKIMI_TAGLINE),
    '',
    chalk.hex(colors.textStrong)('Welcome, researcher.'),
    dim('Curiosity is the engine.'),
    dim('Truth is the destination.'),
    '',
    chalk.hex(colors.primary)(`✦ ${HAKIMI_READY_LINE}`),
  ];
}

function renderHakimiHeader(colors: ColorPalette, innerWidth: number): string[] {
  const textLines = renderHakimiTextBlock(colors);

  if (isRainbowDancing()) {
    const logo = ['Hakimi', 'physics research'] as const;
    const logoWidth = Math.max(...logo.map((row) => visibleWidth(row)));
    const textWidth = Math.max(4, innerWidth - logoWidth - 2);
    const ready = truncateToWidth(chalk.hex(colors.textDim)(HAKIMI_READY_LINE), textWidth, '…');
    return renderDanceWelcomeHeader(colors, logo, textWidth, ready);
  }

  const logo = renderHakimiPixelLogo();
  const logoWidth = Math.max(...logo.map((row) => visibleWidth(row)));
  const gap = '  ';
  const textFullWidth = Math.max(...textLines.map((line) => visibleWidth(line)));

  if (innerWidth < logoWidth + gap.length + textFullWidth) {
    return [...logo, '', ...textLines];
  }

  const rowCount = Math.max(logo.length, textLines.length);
  const lines: string[] = [];
  for (let index = 0; index < rowCount; index++) {
    const left = padAnsi(logo[index] ?? '', logoWidth);
    const right = textLines[index] ?? '';
    lines.push(left + gap + right);
  }
  return lines;
}

export class WelcomeComponent implements Component {
  private state: AppState;
  private colors: ColorPalette;

  constructor(state: AppState, colors: ColorPalette) {
    this.state = state;
    this.colors = colors;
  }

  invalidate(): void {}

  render(width: number): string[] {
    const primary = (s: string): string => chalk.hex(this.colors.primary)(s);
    const boxWidth = Math.max(12, width);
    const innerWidth = Math.max(8, boxWidth - 4);
    const pad = '  ';
    const dim = chalk.hex(this.colors.textDim);
    const labelStyle = chalk.bold.hex(this.colors.textDim);

    const isLoggedOut = !this.state.model;
    const activeModel = this.state.availableModels[this.state.model];
    const modelValue = isLoggedOut
      ? chalk.hex(this.colors.warning)('not set, run /login or /provider')
      : (activeModel?.displayName ?? activeModel?.model ?? this.state.model);

    const infoLines = [
      labelStyle('Directory: ') + this.state.workDir,
      labelStyle('Session:   ') + this.state.sessionId,
      labelStyle('Model:     ') + modelValue,
      labelStyle('Version:   ') + this.state.version,
    ];

    if (this.state.mcpServersSummary) {
      infoLines.push(labelStyle('MCP:       ') + this.state.mcpServersSummary);
    }

    if (isLoggedOut) {
      infoLines.unshift(dim('Run /login or /provider to get started.'));
    } else {
      infoLines.unshift(dim('Send /help for help information.'));
    }

    const contentLines: string[] = [...renderHakimiHeader(this.colors, innerWidth), '', ...infoLines];

    const lines: string[] = [
      '',
      primary('╭' + '─'.repeat(boxWidth - 2) + '╮'),
      primary('│') + ' '.repeat(boxWidth - 2) + primary('│'),
    ];

    for (const content of contentLines) {
      const truncated = truncateToWidth(content, innerWidth, '…');
      const vis = visibleWidth(truncated);
      const rightPad = Math.max(0, innerWidth - vis);
      lines.push(primary('│') + pad + truncated + ' '.repeat(rightPad) + primary('│'));
    }

    lines.push(primary('│') + ' '.repeat(boxWidth - 2) + primary('│'));
    lines.push(primary('╰' + '─'.repeat(boxWidth - 2) + '╯'));
    lines.push('');

    return lines;
  }
}
