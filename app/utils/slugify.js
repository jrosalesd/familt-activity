/**
 * utils/slugify.js
 *
 * Converts any string into a clean URL-safe slug.
 *
 * WHAT YOU'RE LEARNING:
 *   - The utility/helper pattern — small reusable functions
 *     that don't belong to any specific model or controller
 *   - Regular expressions for string cleaning
 *   - Why DRY (Don't Repeat Yourself) matters:
 *     if slug logic is in Family.js AND Task.js AND Reward.js,
 *     fixing a bug means finding and updating every copy.
 *     Here we fix it once and every model benefits.
 *
 * EXAMPLES:
 *   slugify("Rosales Guzman")     → "rosales-guzman"
 *   slugify("Smith & Jones!")     → "smith-jones"
 *   slugify("  Hello   World  ")  → "hello-world"
 *   slugify("Ñoño")               → "nono"  (accents stripped)
 */

function slugify(text, maxLength = 50) {
  return text
    .toString()
    .normalize('NFD')                    // decompose accented chars: ñ → n + ̃
    .replace(/[\u0300-\u036f]/g, '')     // strip the accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')       // remove anything not a-z, 0-9, space, hyphen
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse multiple hyphens
    .slice(0, maxLength);               // enforce max length
}

/**
 * Generate a unique slug for a model by checking the DB.
 * If "rosales-guzman" exists, tries "rosales-guzman-2", then "rosales-guzman-3" etc.
 *
 * @param {string}   text       — the string to slugify
 * @param {Function} checkExists — async (slug) => boolean — checks if slug is taken
 * @param {number}   maxLength  — max slug length
 *
 * EXAMPLE USAGE in a model:
 *   const { makeUniqueSlug } = require('../../app/utils/slugify');
 *   const slug = await makeUniqueSlug(name, async (s) => !!(await Family.first('slug', s)));
 */
async function makeUniqueSlug(text, checkExists, maxLength = 50) {
  const base    = slugify(text, maxLength);
  let   current = base;
  let   counter = 1;

  while (await checkExists(current)) {
    current = `${base}-${++counter}`;
  }

  return current;
}

module.exports = { slugify, makeUniqueSlug };
