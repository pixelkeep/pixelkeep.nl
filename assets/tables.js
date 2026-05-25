/* Pathfinder 1e Sheet — Game Tables (BAB, Save, XP, Carry)
   Source: aonprd.com */
'use strict';

const SHEET_VERSION = '3.13.0';
const SHEET_DATE    = '2026-05-17';

// ── BAB PROGRESSIONS (per level 1-20) ─────────────
// full = +1/level, medium = +¾/level, slow = +½/level
const BAB_TABLE = {
  full:   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
  medium: [0,1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15],
  slow:   [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10],
};

// ── SAVE PROGRESSIONS (per level 1-20) ────────────
// good = 2+½/level, poor = ⅓/level
const SAVE_TABLE = {
  good: [2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12],
  poor: [0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6],
};

// ── XP TABLE (medium progression) ─────────────────
const XP_TABLE = {
  medium: [0,2000,5000,9000,15000,23000,35000,51000,75000,105000,
           155000,220000,315000,445000,635000,890000,1300000,1800000,2550000,3600000],
};

// ══════════════════════════════════════════════════
// CLASSES
// Source: aonprd.com — CRB, ACG, APG, etc.
// ══════════════════════════════════════════════════

// ══════════════════════════════════════════════════
// CARRY CAPACITY TABLE
// Source: aonprd.com CRB Table 7-4
// ══════════════════════════════════════════════════
const CARRY_TABLE = [
  0,10,20,30,40,50,60,70,80,90,100,115,130,150,175,
  200,230,260,300,350,400,460,520,600,700,800,920,
  1040,1200,1400
];

// ══════════════════════════════════════════════════
// HELPER FUNCTIONS — BAB, Saves, XP, Carry
// ══════════════════════════════════════════════════

function getBAB(className, level) {
  const cls = (typeof CLASSES !== 'undefined') ? CLASSES[className] : null;
  if (!cls) return 0;
  const prog = cls.bab || 'medium';
  if (prog === 'full')   return level;
  if (prog === 'medium') return Math.floor(level * 3 / 4);
  if (prog === 'slow')   return Math.floor(level / 2);
  return 0;
}

function getBaseSave(progression, level) {
  if (progression === 'good') return 2 + Math.floor(level / 2);
  return Math.floor(level / 3);
}

function getClassSaves(className, level) {
  const cls = (typeof CLASSES !== 'undefined') ? CLASSES[className] : null;
  if (!cls) return { fort: 0, ref: 0, will: 0 };
  return {
    fort: getBaseSave(cls.fort, level),
    ref:  getBaseSave(cls.ref,  level),
    will: getBaseSave(cls.will, level),
  };
}

function getXPForLevel(level) {
  const XP = [0,0,2000,5000,9000,15000,23000,35000,51000,75000,
              105000,155000,220000,315000,445000,635000,890000,
              1300000,1800000,2550000,3600000];
  return XP[level] || 0;
}

function getCarryCapacity(strScore, size) {
  const base = CARRY_TABLE[Math.min(strScore, 29)] || 0;
  const sizeMod = (typeof SIZE_DATA !== 'undefined' && SIZE_DATA[size])
    ? SIZE_DATA[size].carryMult || 1 : 1;
  return {
    light:  Math.floor(base * sizeMod / 3),
    medium: Math.floor(base * sizeMod * 2 / 3),
    heavy:  Math.floor(base * sizeMod),
    lift:   Math.floor(base * sizeMod * 2),
    drag:   Math.floor(base * sizeMod * 5),
  };
}
