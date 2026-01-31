---
trigger: always_on
---

# Badge Generation Design Guidelines

This document outlines the style and process for generating badge images for Circuit Crawler challenges.

## Visual Style

*   **Theme:** Cyberpunk / Tech / Circuitry.
*   **Style:** Pseudo-3D or Flat Vector with depth (neumorphism/glassmorphism elements acceptable but keep it clean).
*   **Color Palette:** Dark backgrounds (navy, black, dark grey) with vibrant neon accents (cyan, magenta, electric green).
*   **Shape:** Square icon (1024x1024), suitable for masking to a circle.
*   **Content:** Abstract or literal representation of the challenge concept, integrated with circuit traces or robotic elements.
*   **Constraints:** NO TEXT in the image.

## Prompt Template

When using an AI image generator (like DALL-E 3 or similar), use the following template:

> **Prompt:** "A high-quality digital badge icon for a coding challenge named '[CHALLENGE_NAME]'. The visual, symbolic representation of [CHALLENGE_NAME] should be strictly central. Style: Modern vector art, sleek, vibrant neon colors (cyan, purple, lime) on a dark cybernetic background. Include printed circuit board (PCB) traces and tech details. Minimalist but detailed. No text."

## Challenge-Specific Suggestions

| Challenge | Specific Visual Ideas |
| :--- | :--- |
| **Doors** | A futuristic sci-fi door, locked or opening, with wires connected to a panel. |
| **Empty** | A minimalist grid or void, perhaps a single blinking cursor or lone chip. |
| **Example** | A checklist or a simple lightbulb/gear icon representing a tutorial. |
| **No-walls** | An open expanse, arrows pointing outward, freedom from constraints. |
| **Parallel** | Two parallel data streams, dual processors, or synchronized robot arms. |
| **Pressure** | A pressure plate mechanism, a weight, or compressed energy. |
| **Rainbow** | A spectrum of colored wires, a prism refracting data, or RGB LED aesthetics. |
| **Readline** | A terminal prompt (`>_`), command line interface abstract, or matrix code rain. |

## File Naming

Save generated images as `[challenge-name].png` in `packages/circuit-crawler-next/public/badges/`.
