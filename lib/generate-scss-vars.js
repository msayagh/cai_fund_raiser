#!/usr/bin/env node

/**
 * Generate SCSS variables from config.js
 * This script reads theme constants from config and outputs SCSS variable declarations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the config
import { THEMES, TIER_CONFIG, MOBILE_BREAKPOINT } from '../constants/config.js';

function generateScssVars() {
    let scssContent = `// Auto-generated SCSS variables from constants/config.js
// DO NOT EDIT MANUALLY - run: node lib/generate-scss-vars.js

// Layout
$page-max-width: 1600px;
$mobile-breakpoint: ${MOBILE_BREAKPOINT}px;

`;

    // Generate dark theme variables
    scssContent += `// Dark Theme Variables\n`;
    const darkTheme = THEMES.dark;
    Object.entries(darkTheme).forEach(([key, value]) => {
        const scssKey = `$dark-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        scssContent += `${scssKey}: ${value};\n`;
    });

    scssContent += `\n`;

    // Generate light theme variables
    scssContent += `// Light Theme Variables\n`;
    const lightTheme = THEMES.light;
    Object.entries(lightTheme).forEach(([key, value]) => {
        const scssKey = `$light-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        scssContent += `${scssKey}: ${value};\n`;
    });

    scssContent += `\n`;

    // Generate tier colors
    scssContent += `// Tier Colors\n`;
    Object.entries(TIER_CONFIG).forEach(([key, config]) => {
        const scssKey = `$tier-${key}-color`;
        scssContent += `${scssKey}: ${config.color};\n`;
    });

    // Write to file
    const outputPath = path.join(__dirname, 'scss-vars.scss');
    fs.writeFileSync(outputPath, scssContent, 'utf8');
    console.log(`✓ Generated SCSS variables to ${outputPath}`);
}

generateScssVars();
