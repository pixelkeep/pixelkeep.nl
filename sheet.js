/* ══════════════════════════════════════════════════
   Pathfinder 1e Character Sheet — sheet.js
   Auto-calculations, skill table, save/load JSON
   ══════════════════════════════════════════════════ */

'use strict';

// ── SKILLS DEFINITION ──────────────────────────────────────────────
// [id, name, ability, classSkill, trainedOnly]
const SKILLS = [
  ['acrobatics',       'Acrobatics',                 'dex', false, false],
  ['appraise',         'Appraise',                   'int', false, false],
  ['bluff',            'Bluff',                      'cha', false, false],
  ['climb',            'Climb',                      'str', false, false],
  ['craft1',           'Craft ___',                  'int', false, false],
  ['craft2',           'Craft ___',                  'int', false, false],
  ['diplomacy',        'Diplomacy',                  'cha', false, false],
  ['disable_device',   'Disable Device',             'dex', false, true ],
  ['disguise',         'Disguise',                   'cha', false, false],
  ['escape_artist',    'Escape Artist',              'dex', false, false],
  ['fly',              'Fly',                        'dex', false, false],
  ['handle_animal',    'Handle Animal',              'cha', false, true ],
  ['heal',             'Heal',                       'wis', false, false],
  ['intimidate',       'Intimidate',                 'cha', false, false],
  ['k_arcana',         'Knowledge (arcana)',         'int', false, true ],
  ['k_dungeoneering',  'Knowledge (dungeoneering)',  'int', false, true ],
  ['k_engineering',    'Knowledge (engineering)',    'int', false, true ],
  ['k_geography',      'Knowledge (geography)',      'int', false, true ],
  ['k_history',        'Knowledge (history)',        'int', false, true ],
  ['k_local',          'Knowledge (local)',          'int', false, true ],
  ['k_nature',         'Knowledge (nature)',         'int', false, true ],
  ['k_nobility',       'Knowledge (nobility)',       'int', false, true ],
  ['k_planes',         'Knowledge (planes)',         'int', false, true ],
  ['k_religion',       'Knowledge (religion)',       'int', false, true ],
  ['linguistics',      'Linguistics',                'int', false, true ],
  ['perception',       'Perception',                 'wis', false, false],
  ['perform1',         'Perform ___',                'cha', false, false],
  ['perform2',         'Perform ___',                'cha', false, false],
  ['profession1',      'Profession ___',             'wis', false, true ],
  ['profession2',      'Profession ___',             'wis', false, true ],
  ['ride',             'Ride',                       'dex', false, false],
  ['sense_motive',     'Sense Motive',               'wis', false, false],
  ['sleight_of_hand',  'Sleight of Hand',            'dex', false, true ],
  ['spellcraft',       'Spellcraft',                 'int', false, true ],
  ['stealth',          'Stealth',                    'dex', false, false],
  ['survival',         'Survival',                   'wis', false, false],
  ['swim',             'Swim',                       'str', false, false],
  ['use_magic_device', 'Use Magic Device',           'cha', false, true ],
];

// Slot counts — user can change via the +/- buttons in the UI
let WEAPON_COUNT = parseInt(localStorage.getItem('pf1_weapon_count') || '4');
let WAND_COUNT   = parseInt(localStorage.getItem('pf1_wand_count')   || '3');

function setSlotCount(type, delta) {
  if (type === 'weapon') {
    WEAPON_COUNT = Math.max(1, Math.min(8, WEAPON_COUNT + delta));
    try { localStorage.setItem('pf1_weapon_count', WEAPON_COUNT); } catch(e) {}
    buildWeapons(); calcAllWeapons();
    // Re-render feats section to update weapon slot dropdowns
    if (_currentClass) buildFeatsSection(_currentClass, _currentLevel);
  } else {
    WAND_COUNT = Math.max(1, Math.min(8, WAND_COUNT + delta));
    try { localStorage.setItem('pf1_wand_count', WAND_COUNT); } catch(e) {}
    buildWands();
  }
  updateSlotCountDisplay();
}

function updateSlotCountDisplay() {
  const wc = document.getElementById('weapon-count-display');
  const vc = document.getElementById('wand-count-display');
  if (wc) wc.textContent = WEAPON_COUNT;
  if (vc) vc.textContent = WAND_COUNT;
}
const AC_ITEM_COUNT        = 7;
const GEAR_COUNT           = 20;
const MAGIC_ITEM_COUNT     = 8;
const RESOURCE_POOL_COUNT  = 6;
const DAILY_ABILITY_COUNT  = 8;
const MY_ACTIONS_COUNT     = 10;
const BUFF_TRACKER_COUNT   = 6;
const EXTRACT_LEVELS       = 6;

// ── INIT ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════
// SETUP PANEL BUILDERS — character setup + all quick-fills
// ══════════════════════════════════════════════════

function buildSetupPanel() {
  const container = document.getElementById('setup-panel');
  if (!container) return;

  // Race options
  const raceOpts = Object.entries(typeof RACES !== 'undefined' ? RACES : {})
    .sort(([,a],[,b]) => a.name.localeCompare(b.name))
    .map(([k,r]) => `<option value="${k}">${r.name}</option>`)
    .join('');

  // Class options
  const classOpts = Object.entries(typeof CLASSES !== 'undefined' ? CLASSES : {})
    .sort(([,a],[,b]) => a.name.localeCompare(b.name))
    .map(([k,cls]) => `<option value="${k}">${cls.name}${cls.source ? ' ('+cls.source+')' : ''}</option>`)
    .join('');

  // Deity options
  const deityOpts = (typeof DEITIES !== 'undefined' ? DEITIES : [])
    .map(d => `<option value="${d[0]}" data-align="${d[1]}" data-domains="${d[2]}" data-weapon="${d[3]}">${d[0]} (${d[1]}) — ${d[3]}</option>`)
    .join('');

  container.innerHTML = `
    <div class="setup-row">
      <div class="setup-field">
        <span class="setup-field-label">RACE</span>
        <select id="setup_race" onchange="onRaceChange()">
          <option value="">— select —</option>
          ${raceOpts}
        </select>
      </div>
      <div class="setup-field">
        <span class="setup-field-label">CLASS</span>
        <select id="setup_class" onchange="onClassChange()">
          <option value="">— select —</option>
          ${classOpts}
        </select>
      </div>
      <div class="setup-field" style="flex:0 0 auto">
        <span class="setup-field-label">LEVEL</span>
        <input type="number" id="setup_level" min="1" max="20" value="1"
               style="width:46px" oninput="onLevelChange()">
      </div>
      <div class="setup-field" style="flex:0 0 auto">
        <span class="setup-field-label">SIZE</span>
        <select id="setup_size" onchange="onSizeChange()" style="width:90px">
          <option>Fine</option><option>Diminutive</option><option>Tiny</option>
          <option>Small</option><option value="Medium" selected>Medium</option>
          <option>Large</option><option>Huge</option><option>Gargantuan</option><option>Colossal</option>
        </select>
      </div>
      <div class="setup-field">
        <span class="setup-field-label">DEITY</span>
        <select id="setup_deity" onchange="onDeityChange()">
          <option value="">— none —</option>
          ${deityOpts}
        </select>
      </div>
      <button onclick="applySetup()" class="setup-apply-btn">APPLY SETUP</button>
    </div>
    <div id="setup-info" class="setup-info-row"></div>
  `;
}

function buildMagicItemLookup() {
  const container = document.getElementById('magic-item-lookup');
  if (!container) return;

  const slotOpts = ['','Belt','Body','Chest','Eyes','Feet','Hands',
    'Head','Headband','Neck','Ring','Shoulders','Slotless','Wrist','Armor','Shield',
    'Potion','Scroll','Gear']
    .map(s => `<option value="${s}">${s || '— all slots —'}</option>`).join('');

  container.innerHTML = `
    <div class="gear-lookup-row" style="flex-wrap:wrap;gap:6px;align-items:center">
      <input type="text" id="mi_lookup_search" style="width:200px;font-family:var(--font-mono);font-size:10px;border:1px solid var(--border-light);padding:2px 6px;background:var(--cream)"
             placeholder="Search: dusty rose, belt of giant…" oninput="searchMagicItemUI()">
      <select id="mi_lookup_slot" onchange="searchMagicItemUI()" style="font-family:var(--font-mono);font-size:9px;border:1px solid var(--border-light);padding:2px 4px">
        ${slotOpts}
      </select>
      <label style="font-family:var(--font-mono);font-size:9px;display:flex;align-items:center;gap:3px">
        Fill to
        <select id="mi_lookup_target" style="font-family:var(--font-mono);font-size:9px;border:1px solid var(--border-light);padding:2px 4px">
          <option value="ac_auto">AC Items — first empty slot</option>
          <option value="gear_auto">Gear — first empty slot</option>
        </select>
        Slot
        <select id="mi_lookup_acslot" style="font-family:var(--font-mono);font-size:9px;border:1px solid var(--border-light);padding:2px 4px">
          ${Array.from({length: AC_ITEM_COUNT}, (_,i) => `<option value="${i}">Slot ${i+1}</option>`).join('')}
        </select>
        <button onclick="applyMagicItemLookup()" style="background:var(--accent2);color:#fff;border:none;padding:3px 10px;font-family:var(--font-mono);font-size:9px;cursor:pointer">FILL</button>
      </label>
    </div>
    <div id="mi_search_results" style="margin-top:4px;max-height:140px;overflow-y:auto;font-size:9px"></div>
  `;

  searchMagicItemUI();
}

function buildWeaponLookup() {
  const container = document.getElementById('weapon-lookup');
  if (!container || typeof WEAPONS === 'undefined') return;

  const opts = Object.keys(WEAPONS).sort()
    .map(w => `<option value="${w}">${w}</option>`)
    .join('');

  container.innerHTML = `
    <div class="weapon-lookup-row">
      <select id="wpn_lookup_name" style="width:200px">
        <option value="">— lookup weapon —</option>
        ${opts}
      </select>
      <select id="wpn_lookup_slot" style="width:90px">
        ${Array.from({length:WEAPON_COUNT},(_,i)=>`<option value="${i}">Weapon ${i+1}</option>`).join('')}
      </select>
      <label><input type="checkbox" id="wpn_lookup_mw"> Masterwork (+1 atk)</label>
      <label>Enhance
        <input type="number" id="wpn_lookup_enhance" class="num small-num" min="0" max="5" value="0">
      </label>
      <button onclick="applyWeaponLookup()">FILL SLOT</button>
    </div>
  `;
}

function buildArmorLookup() {
  const container = document.getElementById('armor-lookup');
  if (!container || typeof ARMOR === 'undefined') return;

  const opts = Object.keys(ARMOR).sort()
    .map(a => `<option value="${a}">${a}</option>`)
    .join('');

  container.innerHTML = `
    <div class="armor-lookup-row">
      <select id="armor_lookup_name" style="width:200px">
        <option value="">— lookup armor/shield —</option>
        ${opts}
      </select>
      <select id="armor_lookup_slot" style="width:90px">
        ${Array.from({length:AC_ITEM_COUNT},(_,i)=>`<option value="${i}">Slot ${i+1}</option>`).join('')}
      </select>
      <label><input type="checkbox" id="armor_lookup_mw"> Masterwork</label>
      <label>Enhance
        <input type="number" id="armor_lookup_enhance" class="num small-num" min="0" max="5" value="0">
      </label>
      <button onclick="applyArmorLookup()">FILL SLOT</button>
    </div>
  `;
}

function buildGearLookup() {
  const container = document.getElementById('gear-lookup');
  if (!container || typeof COMMON_GEAR === 'undefined') return;

  const opts = Object.keys(COMMON_GEAR).sort()
    .map(g => `<option value="${g}">${g}</option>`)
    .join('');

  container.innerHTML = `
    <div class="gear-lookup-row">
      <select id="gear_lookup_name" style="width:200px">
        <option value="">— quick-add gear —</option>
        ${opts}
      </select>
      <button onclick="applyGearLookup()">ADD TO GEAR</button>
    </div>
  `;
}

function applyWeaponLookup() {
  const name   = val('wpn_lookup_name');
  const slot   = parseInt(val('wpn_lookup_slot')) || 0;
  const mw     = document.getElementById('wpn_lookup_mw')?.checked;
  const enh    = parseInt(val('wpn_lookup_enhance')) || 0;
  const wpn    = (typeof WEAPONS !== 'undefined') ? WEAPONS[name] : null;
  if (!wpn) { alert('Select a weapon first.'); return; }

  set(`wpn_name_${slot}`,      name + (enh > 0 ? ` +${enh}` : mw ? ' (MW)' : ''));
  set(`wpn_dmg_dice_${slot}`,  wpn.dmg     || '');
  set(`wpn_crit_${slot}`,      wpn.crit    || '×2');
  set(`wpn_type_${slot}`,      wpn.type    || '');
  set(`wpn_range_${slot}`,     wpn.range   || 'melee');
  set(`wpn_enh_${slot}`,       enh > 0 ? enh : (mw ? 1 : 0));

  // Set checkboxes based on weapon properties
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) { el.checked = !!v; el.disabled = false; } };
  const isTwoH = wpn.twoHanded || (wpn.hands === 2);
  const isRanged = (wpn.range || '').toLowerCase().includes('ft') || wpn.ranged;
  setChk(`wpn_twohanded_${slot}`, isTwoH);
  setChk(`wpn_offhand_${slot}`,   false);
  setChk(`wpn_ranged_${slot}`,    isRanged);
  setChk(`wpn_mw_${slot}`,        mw && enh === 0);

  // Material select — set to Normal; user can change after
  const matEl = document.getElementById(`wpn_material_${slot}`);
  if (matEl) matEl.value = 'Normal';

  calcWeapon(slot);
}

function applyArmorLookup() {
  const name   = val('armor_lookup_name');
  const slot   = parseInt(val('armor_lookup_slot')) || 0;
  const mw     = document.getElementById('armor_lookup_mw')?.checked;
  const enh    = parseInt(val('armor_lookup_enhance')) || 0;
  const armor  = (typeof ARMOR !== 'undefined') ? ARMOR[name] : null;
  if (!armor) { alert('Select an armor or shield first.'); return; }

  set(`aci_name_${slot}`,   name + (enh > 0 ? ` +${enh}` : mw ? ' (MW)' : ''));
  set(`aci_bonus_${slot}`,  (armor.acBonus || armor.bonus || 0) + enh);
  set(`aci_type_${slot}`,   armor.armorType || armor.type || '');
  set(`aci_maxdex_${slot}`, armor.maxDex !== undefined ? armor.maxDex : '');
  const checkPen = armor.checkPen !== undefined ? armor.checkPen : (armor.check !== undefined ? armor.check : null);
  set(`aci_check_${slot}`,  checkPen !== null ? (mw ? checkPen + 1 : checkPen) : '');
  set(`aci_sf_${slot}`,     armor.spellFail || '');
  set(`aci_wt_${slot}`,     armor.weight || '');
  set(`aci_props_${slot}`,  armor.note || '');
  calcACItems();
}

function applyGearLookup() {
  const name = val('gear_lookup_name');
  const gear = (typeof COMMON_GEAR !== 'undefined') ? COMMON_GEAR[name] : null;
  if (!gear) { alert('Select an item first.'); return; }

  for (let i = 0; i < GEAR_COUNT; i++) {
    if (!val(`gear_name_${i}`)) {
      set(`gear_name_${i}`, name);
      set(`gear_wt_${i}`, gear.weight || 0);
      calcGear();
      return;
    }
  }
  alert('No empty gear slots. Clear one first.');
}


/* ══════════════════════════════════════════════════
   ITEM BONUS SYSTEM
   Tracks which items are equipped and what bonuses
   they provide. Handles stacking rules correctly.
   Enhancement bonuses to the same stat don't stack.
   ══════════════════════════════════════════════════ */

// Registry: itemName → { statBonus, skillBonus, saveBonus, speedBonus, acBonus, slot, acSlot }
let _itemBonusRegistry = {};

// Apply all item bonuses from registry to the sheet
function applyAllItemBonuses() {
  // Collect totals per ability/skill/save (highest enhancement wins per type)
  const statBonuses  = {};  // ability → { enhancement: max, luck: sum, ... }
  const skillBonuses = {};  // skillId → total
  const saveBonuses  = {};  // fort/ref/will → total
  let   speedBonus   = 0;

  Object.values(_itemBonusRegistry).forEach(entry => {
    const item = entry.itemData;
    if (!item) return;

    // Stat bonuses — enhancement doesn't stack; take highest per ability
    if (item.statBonus) {
      const btype = item.bonusType || 'enhancement';
      Object.entries(item.statBonus).forEach(([ab, amt]) => {
        if (!statBonuses[ab]) statBonuses[ab] = {};
        if (btype === 'enhancement') {
          statBonuses[ab].enhancement = Math.max(statBonuses[ab].enhancement || 0, amt);
        } else {
          statBonuses[ab][btype] = (statBonuses[ab][btype] || 0) + amt;
        }
      });
    }

    // Skill bonuses — competence doesn't stack; take highest
    if (item.skillBonus) {
      Object.entries(item.skillBonus).forEach(([skillId, amt]) => {
        skillBonuses[skillId] = Math.max(skillBonuses[skillId] || 0, amt);
      });
    }

    // Save bonuses — resistance doesn't stack; take highest
    if (item.saveBonus) {
      const btype = item.bonusType || 'resistance';
      ['fort','ref','will'].forEach(s => {
        if (item.saveBonus[s]) {
          if (btype === 'resistance') {
            saveBonuses[s] = Math.max(saveBonuses[s] || 0, item.saveBonus[s]);
          } else {
            saveBonuses[s] = (saveBonuses[s] || 0) + item.saveBonus[s];
          }
        }
      });
    }

    // Speed bonus — enhancement doesn't stack; take highest
    if (item.speedBonus) {
      speedBonus = Math.max(speedBonus, item.speedBonus);
    }
  });

  // Apply stat bonuses — write to dedicated item bonus display fields
  // calcMod reads these via getEffectiveMod
  const ALL_ABILITIES = ['str','dex','con','int','wis','cha'];
  ALL_ABILITIES.forEach(ab => {
    const bonuses = statBonuses[ab];
    const total = bonuses ? Object.values(bonuses).reduce((a,b) => a+b, 0) : 0;
    // Store in hidden input that calcMod reads
    let hiddenEl = document.getElementById('item_bonus_' + ab);
    if (!hiddenEl) {
      hiddenEl = document.createElement('input');
      hiddenEl.type = 'hidden';
      hiddenEl.id = 'item_bonus_' + ab;
      document.body.appendChild(hiddenEl);
    }
    hiddenEl.value = total || '0';
    calcMod(ab);
  });

  // Apply skill bonuses to sk_misc fields
  Object.entries(skillBonuses).forEach(([skillId, total]) => {
    const miscEl = document.getElementById('sk_misc_' + skillId);
    if (!miscEl) return;
    // Store base misc separately
    const base = parseInt(miscEl.dataset.baseValue || '0') || 0;
    miscEl.value = base + total;
    calcSkill(skillId);
  });

  // Apply save bonuses to save misc
  Object.entries(saveBonuses).forEach(([save, total]) => {
    const miscEl = document.getElementById(save + '_misc');
    if (!miscEl) return;
    const base = parseInt(miscEl.dataset.baseValue || '0') || 0;
    miscEl.value = base + total;
  });
  if (Object.keys(saveBonuses).length) calcSaves();

  // Apply speed bonus — always calculate from BASE race speed + item bonus
  // Never accumulate from current field value
  const raceKey = val('_applied_race');
  const raceData = (raceKey && typeof RACES !== 'undefined') ? RACES[raceKey] : null;
  const baseSpeed = raceData ? raceData.speed : 30;
  if (speedBonus > 0) {
    set('speed_land', baseSpeed + speedBonus);
  } else {
    // Ensure speed is correct even without boot bonus
    const currentSpeed = parseInt(val('speed_land')) || 0;
    if (currentSpeed > baseSpeed + 30) {
      // Looks like accumulated — reset to base
      set('speed_land', baseSpeed);
    }
  }

  // Update item bonus display panel
  updateItemBonusPanel();
}

// Register an item as equipped (called when filling a slot)
function registerItemBonus(itemName, acSlot) {
  const item = typeof getMagicItem !== 'undefined' ? getMagicItem(itemName) : null;
  if (!item) return;

  // Only register items with actual bonuses
  const hasBonuses = item.statBonus || item.skillBonus || item.saveBonus ||
                     item.speedBonus || (item.acBonus && item.acType === 'deflection') ||
                     (item.acBonus && item.acType === 'insight') ||
                     (item.acBonus && item.acType === 'natural armor');
  if (!hasBonuses) return;

  _itemBonusRegistry[itemName] = { itemData: item, acSlot: acSlot };
  saveItemRegistry();
  applyAllItemBonuses();
}

// Unregister an item (called when clearing a slot)
function unregisterItemBonus(itemName) {
  if (_itemBonusRegistry[itemName]) {
    delete _itemBonusRegistry[itemName];
    saveItemRegistry();
    applyAllItemBonuses();
  }
}

// Detect items in AC slots and sync registry
function syncItemRegistry() {
  // Clear stat/skill item bonuses first
  _itemBonusRegistry = {};

  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    const name = val('aci_name_' + i);
    if (!name) continue;
    const item = typeof getMagicItem !== 'undefined' ? getMagicItem(name) : null;
    if (!item) continue;
    if (item.statBonus || item.skillBonus || item.saveBonus || item.speedBonus) {
      _itemBonusRegistry[name] = { itemData: item, acSlot: i };
    }
  }
  applyAllItemBonuses();
  // Recalc weapons after item bonuses applied (STR mod changes affect damage)
  if (typeof calcAllWeapons !== 'undefined') calcAllWeapons();
}

// Persist registry in save data (via collectData)
function saveItemRegistry() {
  // Stored as part of collectData/_version
}

// Show active item bonuses in a small panel
function updateItemBonusPanel() {
  const panel = document.getElementById('item-bonus-panel');
  if (!panel) return;
  const entries = Object.entries(_itemBonusRegistry);
  if (!entries.length) { panel.innerHTML = '<span style="opacity:.5;font-size:8px">No active item bonuses</span>'; return; }

  panel.innerHTML = entries.map(([name, entry]) => {
    const item = entry.itemData;
    const parts = [];
    if (item.statBonus) parts.push(...Object.entries(item.statBonus).map(([ab,v])=>`+${v} ${ab.toUpperCase()}`));
    if (item.skillBonus) parts.push(...Object.entries(item.skillBonus).map(([sk,v])=>`+${v} ${sk}`));
    if (item.saveBonus && !item.saveCondition) parts.push(...Object.entries(item.saveBonus).map(([s,v])=>`+${v} ${s}`));
    if (item.speedBonus) parts.push(`+${item.speedBonus} speed`);
    return `<span class="item-bonus-tag" title="${name}">
      <span class="item-bonus-name">${name.substring(0,25)}${name.length>25?'…':''}</span>
      <span class="item-bonus-values">${parts.join(', ')}</span>
    </span>`;
  }).join('');
}

// Hook into AC item name fields — detect when item name changes
function watchACItemName(slot) {
  const el = document.getElementById('aci_name_' + slot);
  if (!el || el.dataset.watchingItems) return;
  el.dataset.watchingItems = '1';
  el.addEventListener('change', () => {
    // Re-sync the whole registry when any AC name changes
    setTimeout(syncItemRegistry, 100);
  });
}

// Init watching on all AC slots
function initItemBonusWatchers() {
  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    watchACItemName(i);
  }
}


/* ══════════════════════════════════════════════════
   ENHANCE EXISTING AC ITEM
   Call from the AC Items table directly
   ══════════════════════════════════════════════════ */
function enhanceACItem(slot) {
  const name    = val('aci_name_' + slot);
  if (!name) { alert('Fill in the item name first.'); return; }
  const current = parseInt(val('aci_bonus_' + slot)) || 0;

  // Ask what to do
  const choice = prompt(
    `"${name}" — choose:
` +
    `  m = Masterwork (+0 bonus, no check penalty reduction for armor)
` +
    `  1-5 = Enhancement bonus (+1 to +5, implies masterwork)
` +
    `  a = Adamantine (DR 2/—)
` +
    `  s = Mithral (counts as lighter category)
`,
    '1'
  );
  if (!choice) return;

  // Lookup base armor data
  const baseName = name.replace(/\s*[+]\d+\s*$/, '').replace(/\s*[(]MW[)]\s*$/, '').trim();
  const armorData = typeof ARMOR !== 'undefined' ? ARMOR[baseName] : null;
  const baseBonus = armorData ? (armorData.acBonus || armorData.bonus || 0) : current;
  const baseCheck = armorData ? (armorData.checkPen || armorData.check || 0) : 0;

  if (choice.toLowerCase() === 'm') {
    // Masterwork: reduce check penalty by 1
    set('aci_name_' + slot, baseName + ' (MW)');
    if (baseCheck < 0) set('aci_check_' + slot, baseCheck + 1);
    const props = val('aci_props_' + slot);
    if (!props.includes('Masterwork')) set('aci_props_' + slot, (props ? props + '; ' : '') + 'Masterwork');
  } else if (choice.toLowerCase() === 'a') {
    set('aci_name_' + slot, 'Adamantine ' + baseName);
    const dr = baseName.toLowerCase().includes('full') ? 3 : baseName.toLowerCase().includes('plate') ? 3 : 2;
    set('aci_props_' + slot, `Adamantine — DR ${dr}/—`);
  } else if (choice.toLowerCase() === 's') {
    set('aci_name_' + slot, 'Mithral ' + baseName);
    set('aci_props_' + slot, 'Mithral — counts as ' + (baseBonus >= 6 ? 'medium' : 'light') + ' armor. No arcane failure for divine.');
    if (baseCheck < 0) set('aci_check_' + slot, Math.min(0, baseCheck + 3)); // mithral reduces check pen by 3
  } else {
    const enh = parseInt(choice);
    if (isNaN(enh) || enh < 1 || enh > 5) { alert('Enter m, a, s, or a number 1-5.'); return; }
    set('aci_bonus_' + slot, baseBonus + enh);
    set('aci_name_' + slot, baseName + ' +' + enh);
    if (baseCheck < 0) set('aci_check_' + slot, baseCheck + 1); // masterwork implied
  }
  calcACItems();
}

/* ══════════════════════════════════════════════════
   WARPRIEST BLESSINGS UI
   ══════════════════════════════════════════════════ */

function buildBlessingsBlock(container, level) {
  // Only for Warpriest
  const cls = (val('charClass') || '').toLowerCase();
  if (!cls.includes('warpriest')) return;
  if (!container) container = document.getElementById('class-specific-block');
  if (!container) return;
  if (typeof WARPRIEST_BLESSINGS === 'undefined') return;

  level = level || parseInt(val('charLevel')) || 1;
  const hasMajor = level >= 10;

  // Get deity domains to pre-filter blessings
  const deityName = val('deity') || '';
  const deityRow  = typeof DEITIES !== 'undefined' ? DEITIES.find(d => d[0] === deityName) : null;
  const deityDomains = deityRow ? deityRow[2].split(',').map(s => s.trim()) : [];

  // Build domain hint
  let domainHint = '';
  if (deityDomains.length) {
    const matching = deityDomains.filter(d => WARPRIEST_BLESSINGS[d]);
    domainHint = matching.length
      ? `<span class="section-note">Deity domains: <strong>${matching.join(', ')}</strong> — these are your eligible blessings</span>`
      : `<span class="section-note">Deity: ${deityName} — domains: ${deityDomains.join(', ')}</span>`;
  }

  container.innerHTML = `
    <div class="section-box">
      <div class="section-title">Blessings ${domainHint}</div>
      <div class="section-note" style="margin-bottom:4px">
        ${hasMajor ? '✅ Minor + Major powers unlocked' : 'Minor power only at this level (Major unlocks at level 10)'}
        · Uses: <strong>${3 + Math.floor(level/2)}/day</strong>
        · Swift action
      </div>
      <div class="blessings-grid">
        ${buildBlessingSlot(1, hasMajor, deityDomains)}
        ${buildBlessingSlot(2, hasMajor, deityDomains)}
      </div>
    </div>`;
}

function buildBlessingSlot(slot, hasMajor, deityDomains) {
  deityDomains = deityDomains || [];
  const saved = val('blessing' + slot + '_name') || '';
  const domainHint = deityDomains.length
    ? `e.g. ${deityDomains.filter(d => typeof WARPRIEST_BLESSINGS !== 'undefined' && WARPRIEST_BLESSINGS[d]).slice(0,3).join(', ')}…`
    : 'e.g. Good, War, Protection…';
  return `
    <div class="blessing-slot">
      <div class="blessing-search-wrap" style="position:relative">
        <input type="text" id="blessing${slot}_name" class="blessing-name-input"
               value="${saved.replace(/"/g,'&quot;')}"
               placeholder="${domainHint}"
               oninput="onBlessingSearch(${slot})" autocomplete="off"
               data-deity-domains="${deityDomains.join(',')}">
        <div id="blessing${slot}_suggestions" class="feat-suggestions"></div>
      </div>
      <div id="blessing${slot}_details" class="blessing-details">
        ${saved ? renderBlessingDetails(saved, hasMajor) : ''}
      </div>
    </div>`;
}

function renderBlessingDetails(name, hasMajor) {
  if (typeof WARPRIEST_BLESSINGS === 'undefined') return '';
  const b = WARPRIEST_BLESSINGS[name];
  if (!b) return `<span class="helper-text">Blessing not found: ${name}</span>`;
  return `
    <div class="blessing-power">
      <span class="blessing-power-label">Minor</span>
      <span class="blessing-power-text">${b.minor}</span>
    </div>
    <div class="blessing-power ${hasMajor ? 'blessing-major' : 'blessing-major-locked'}">
      <span class="blessing-power-label">Major</span>
      <span class="blessing-power-text">${hasMajor ? b.major : '<em style="color:var(--border)">Unlocks at level 10: ' + b.major + '</em>'}</span>
    </div>`;
}

function onBlessingSearch(slot) {
  const input = document.getElementById('blessing' + slot + '_name');
  const query = input ? input.value : '';
  const sug   = document.getElementById('blessing' + slot + '_suggestions');
  if (!sug || typeof WARPRIEST_BLESSINGS === 'undefined') return;

  // Get deity domains from input data attribute
  const deityDomains = (input && input.dataset.deityDomains)
    ? input.dataset.deityDomains.split(',').filter(Boolean) : [];

  // If no query and deity has domains, show deity domains first
  const allResults = Object.entries(WARPRIEST_BLESSINGS);
  let results;
  if (!query) {
    // Show deity-relevant blessings first if available, else all
    if (deityDomains.length) {
      const deityMatches = allResults.filter(([n]) => deityDomains.includes(n));
      const others = allResults.filter(([n]) => !deityDomains.includes(n));
      results = [...deityMatches, ...others];
    } else {
      results = allResults;
    }
  } else {
    results = allResults.filter(([n]) =>
      n.toLowerCase().startsWith(query.toLowerCase()) ||
      n.toLowerCase().includes(query.toLowerCase()));
  }

  if (!results.length) { sug.style.display = 'none'; return; }
  sug._blessingResults = results;
  sug.innerHTML = results.map(([name, b], idx) =>
    `<div class="feat-suggestion-item" onmousedown="event.preventDefault();selectBlessing(${slot},${idx})">
      <span class="feat-sug-name">${name}</span>
      <span class="feat-sug-benefit">${b.minor.substring(0,60)}…</span>
    </div>`
  ).join('');
  sug.style.display = 'block';
}

function selectBlessing(slot, idx) {
  const sugId = 'blessing' + slot + '_suggestions';
  const sug   = document.getElementById(sugId);
  if (!sug || !sug._blessingResults) return;
  const [name] = sug._blessingResults[idx];
  set('blessing' + slot + '_name', name);
  sug.style.display = 'none';

  // Render details
  const level = parseInt(val('charLevel')) || 1;
  const detailsEl = document.getElementById('blessing' + slot + '_details');
  if (detailsEl) detailsEl.innerHTML = renderBlessingDetails(name, level >= 10);
}

// Close blessing suggestions on outside click
document.addEventListener('mousedown', e => {
  if (!e.target.closest('.blessing-search-wrap')) {
    document.querySelectorAll('[id$="_suggestions"]').forEach(el => {
      if (el.id.startsWith('blessing')) el.style.display = 'none';
    });
  }
});


/* ══════════════════════════════════════════════════
   RACIAL TRAITS & SPECIAL ABILITIES AS CARDS
   ══════════════════════════════════════════════════ */

function renderRacialTraitCards() {
  // Racial traits shown on page 2 in the class-specific block style
  // Find the racial-traits section in the class abilities sidebar
  const container = document.getElementById('racial-traits-cards');
  if (!container) return;

  // Try _applied_race first, then charRace display value lowercased
  let raceKey = val('_applied_race') || '';
  if (!raceKey) {
    const raceName = (val('charRace') || '').toLowerCase().trim();
    if (raceName && typeof RACES !== 'undefined') {
      // Find key that matches name
      raceKey = Object.keys(RACES).find(k => k.toLowerCase() === raceName ||
        (RACES[k].name || '').toLowerCase() === raceName) || '';
    }
  }
  const raceData = (raceKey && typeof RACES !== 'undefined') ? RACES[raceKey] : null;
  const traits = raceData ? raceData.traits : [];

  if (!traits || !traits.length) {
    container.innerHTML = '<span class="helper-text" style="font-size:9px;color:var(--border)">Apply Setup to populate racial traits</span>';
    return;
  }

  // Use same pill/card style as class abilities
  container.innerHTML = traits.map(t => {
    // traits are strings like "Darkvision: 60 ft."
    const str = typeof t === 'string' ? t : (t.name ? t.name + (t.desc ? ': ' + t.desc : '') : String(t));
    const colonIdx = str.indexOf(':');
    const name = colonIdx > -1 ? str.substring(0, colonIdx) : str;
    const desc = colonIdx > -1 ? str.substring(colonIdx + 1).trim() : '';
    return `<div class="class-ability-row">
      <span class="ca-badge ca-badge-gen">Race</span>
      <span class="ca-name">${name}</span>
      <span class="ca-desc">${desc}</span>
    </div>`;
  }).join('');
}

function renderDeityObedienceCard() {
  const box  = document.getElementById('deity-obedience-box');
  const card = document.getElementById('deity-obedience-card');
  if (!box || !card) return;

  const deityName = val('deity') || '';
  if (!deityName || typeof DEITY_PERKS === 'undefined') { box.style.display = 'none'; return; }

  const perk = DEITY_PERKS[deityName];
  if (!perk) { box.style.display = 'none'; return; }

  box.style.display = '';
  card.innerHTML = `
    <div class="ability-card deity-card">
      <div class="ability-card-name">Deity Obedience — ${deityName}</div>
      <div class="ability-card-text">${perk.perk || perk.benefit || perk.text || ''}</div>
      ${perk.obedience ? `<div class="ability-card-req">⚠ Ritual: ${perk.obedience}</div>` : ''}
    </div>`;
}

function renderSpecialAbilityCards() {
  // Show extra notes textarea — for anything else the user wants to note
  const ta = document.getElementById('special_abilities_extra');
  if (!ta) return;
  // Also sync from old special_abilities field on first load
  const oldTa = document.getElementById('special_abilities');
  if (oldTa && oldTa.value && !ta.value) {
    // Extract non-racial, non-deity content
    const lines = oldTa.value.split('\n');
    const extra = lines.filter(l =>
      !l.startsWith('--- Racial') &&
      !l.startsWith('[Deity') &&
      !l.startsWith('[Trait:') &&
      !l.match(/^(Darkvision|Defensive Training|Greed|Hatred|Hardy|Slow and|Stability|Stonecunning|Weapon Familiarity)/)
    ).join('\n').trim();
    if (extra) ta.value = extra;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Run each builder independently so one failure doesn't block the rest
  const safe = (fn, name) => {
    try { fn(); }
    catch(e) { console.error(`Error in ${name}:`, e); }
  };
  safe(buildSetupPanel,     'buildSetupPanel');
  safe(buildWeaponLookup,   'buildWeaponLookup');
  safe(buildArmorLookup,    'buildArmorLookup');
  safe(buildGearLookup,     'buildGearLookup');
  safe(buildMagicItemLookup,'buildMagicItemLookup');
  safe(buildSkillsTable,    'buildSkillsTable');
  safe(() => buildLanguagePicker([], []), 'buildLanguagePicker');
  safe(buildWeapons,        'buildWeapons');
  safe(buildWands,          'buildWands');
  safe(buildACItems,        'buildACItems');
  safe(buildGear,           'buildGear');
  safe(buildMagicItems,     'buildMagicItems');
  safe(calcAll,             'calcAll');
  safe(updateSlotCountDisplay, 'updateSlotCountDisplay');
  safe(initItemBonusWatchers, 'initItemBonusWatchers');
});

// ── ABILITY MODIFIER ───────────────────────────────────────────────
function abilityMod(score) {
  if (score === '' || score === null || isNaN(score)) return 0;
  return Math.floor((parseInt(score) - 10) / 2);
}

function calcMod(ability) {
  const score    = parseInt(val(`${ability}_score`)) || 0;
  const tempVal  = val(`${ability}_temp`);
  // Item bonus from equipped magic items (e.g. Belt of Giant Strength +2)
  const itemBonus = parseInt(document.getElementById('item_bonus_'+ability)?.value || '0') || 0;
  const effective = (tempVal !== '') ? (parseInt(tempVal) || 0) : (score + itemBonus);
  const mod       = abilityMod(score + itemBonus);
  const tempMod   = (tempVal !== '') ? abilityMod(effective) : (itemBonus ? abilityMod(score+itemBonus) : '');

  set(`${ability}_mod`,      mod);
  set(`${ability}_temp_mod`, tempMod !== '' ? tempMod : '');

  // Show item bonus badge inline next to the mod field
  const bonusEl = document.getElementById(`${ability}_item_badge`);
  if (bonusEl) {
    if (itemBonus > 0) {
      bonusEl.textContent = `+${itemBonus}`;
      bonusEl.style.display = 'inline-block';
      bonusEl.title = `Item bonus: +${itemBonus} ${ability.toUpperCase()} (enhancement)`;
    } else {
      bonusEl.textContent = '';
      bonusEl.style.display = 'none';
    }
  }

  // cascade
  calcInit();
  calcAC();
  calcSaves();
  calcCombat();
  calcSkills();
}

// ── INITIATIVE ─────────────────────────────────────────────────────
function calcInit() {
  const dexMod = getEffectiveMod('dex');
  const misc   = parseInt(val('init_misc')) || 0;
  set('init_dex',   dexMod);
  set('init_total', dexMod + misc);
}

// ── ARMOR CLASS ────────────────────────────────────────────────────
function calcAC() {
  const dexMod  = getEffectiveMod('dex');
  const armor   = Math.max(0, parseInt(val('ac_armor'))   || 0);
  const shield  = Math.max(0, parseInt(val('ac_shield'))  || 0);
  const size    = parseInt(val('ac_size'))    || 0;
  const natural = Math.max(0, parseInt(val('ac_natural')) || 0);
  const deflect = Math.max(0, parseInt(val('ac_deflect')) || 0);
  const misc    = parseInt(val('ac_misc'))    || 0;

  set('ac_dex', dexMod);

  const total     = 10 + armor + shield + dexMod + size + natural + deflect + misc;
  const touch     = 10 + dexMod + size + deflect + misc;
  const flatFooted= 10 + armor + shield + size + natural + deflect + misc;

  set('ac_total', total);
  set('ac_touch', touch);
  set('ac_ff',    flatFooted);
}

// ── SAVING THROWS ──────────────────────────────────────────────────
function calcSaves() {
  const conMod = getEffectiveMod('con');
  const dexMod = getEffectiveMod('dex');
  const wisMod = getEffectiveMod('wis');

  set('fort_ability', conMod);
  set('ref_ability',  dexMod);
  set('will_ability', wisMod);

  ['fort', 'ref', 'will'].forEach(s => {
    const base   = parseInt(val(`${s}_base`))  || 0;
    const abil   = parseInt(val(`${s}_ability`)) || 0;
    const magic  = parseInt(val(`${s}_magic`)) || 0;
    const misc   = parseInt(val(`${s}_misc`))  || 0;
    const temp   = parseInt(val(`${s}_temp`))  || 0;
    set(`${s}_total`, base + abil + magic + misc + temp);
  });
}

// ── COMBAT (BAB / CMB / CMD) ───────────────────────────────────────
function calcCombat() {
  const bab    = parseInt(val('bab'))      || 0;
  const strMod = getEffectiveMod('str');
  const dexMod = getEffectiveMod('dex');
  const cmbSize= parseInt(val('cmb_size')) || 0;
  const cmbMisc= parseInt(val('cmb_misc')) || 0;
  const cmdSize= parseInt(val('cmd_size')) || 0;

  set('cmb_bab', bab);
  set('cmb_str', strMod);
  set('cmb_total', bab + strMod + cmbSize + cmbMisc);

  set('cmd_bab', bab);
  set('cmd_str', strMod);
  set('cmd_dex', dexMod);
  set('cmd_total', 10 + bab + strMod + dexMod + cmdSize);
}

// ── SKILLS TABLE ───────────────────────────────────────────────────
function buildSkillsTable() {
  const tbody = document.getElementById('skills-tbody');
  tbody.innerHTML = '';

  SKILLS.forEach(([id, name, ability, , trainedOnly]) => {
    const tr = document.createElement('tr');
    tr.className = 'skill-row';
    tr.dataset.skill = id;
    tr.dataset.ability = ability;

    const trainedMark = trainedOnly ? '<span class="trained-marker" title="Trained Only">*</span>' : '';

    const abilLabel = ability.toUpperCase();
    tr.innerHTML = `
      <td><span class="cs-dot" id="cs_${id}" onclick="toggleCS('${id}')" title="Class Skill"></span></td>
      <td class="skill-name"><span class="skill-abil-tag">${abilLabel}</span> ${name}${trainedMark}</td>
      <td><input type="number" id="sk_total_${id}" class="num small-num" readonly></td>
      <td><input type="number" id="sk_ability_${id}" class="num small-num" readonly></td>
      <td><input type="number" id="sk_ranks_${id}" class="num small-num" oninput="calcSkill('${id}')"></td>
      <td><input type="number" id="sk_misc_${id}" class="num small-num" oninput="calcSkill('${id}')"></td>
      <td class="bonus-col"><span id="sk_bonus_${id}" class="skill-bonus-tag"></span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── LANGUAGE PICKER ────────────────────────────────────────────────
// Race defaults and bonus languages are highlighted when set via Setup
let _racialLanguages   = [];   // auto-known for this race
let _bonusLanguages    = [];   // available as bonus choices

function buildLanguagePicker(racialLangs, bonusLangs) {
  _racialLanguages = racialLangs  || [];
  _bonusLanguages  = bonusLangs   || [];

  const container = document.getElementById('languages-checkboxes');
  if (!container) return;

  container.innerHTML = '';

  ALL_LANGUAGES.forEach(lang => {
    const isRacial = _racialLanguages.includes(lang);
    const isBonus  = _bonusLanguages.includes(lang);
    const isChecked = isRacial; // racial languages pre-checked

    const label = document.createElement('label');
    label.className = 'lang-item' +
      (isRacial ? ' lang-racial' : '') +
      (isBonus  ? ' lang-bonus'  : '');
    label.title = isRacial ? 'Racial language (auto-known)'
                : isBonus  ? 'Available as bonus language choice'
                : '';

    label.innerHTML = `
      <input type="checkbox" id="lang_${lang.replace(/[^a-z]/gi,'_')}"
             class="lang-checkbox" data-lang="${lang}"
             ${isChecked ? 'checked' : ''}
             onchange="updateLanguageField()">
      ${lang}`;

    container.appendChild(label);
  });

  updateLanguageField();
}

function updateLanguageField() {
  // Build the languages text field from checked boxes + custom
  const checked = [...document.querySelectorAll('.lang-checkbox:checked')]
    .map(cb => cb.dataset.lang);
  const custom = val('languages_custom');
  const all = custom ? [...checked, custom] : checked;
  // Keep the hidden text field in sync for save/load compatibility
  set('languages', all.join(', '));
}

function restoreLanguagePicker(langString) {
  if (!langString) return;
  const langs = langString.split(',').map(l => l.trim());
  langs.forEach(lang => {
    const id = `lang_${lang.replace(/[^a-z]/gi,'_')}`;
    const cb = document.getElementById(id);
    if (cb) cb.checked = true;
  });
  updateLanguageField();
}


function toggleCS(id) {
  const dot = document.getElementById(`cs_${id}`);
  dot.classList.toggle('checked');
  calcSkill(id);
}

// Active deity bonus state — typed, matches DEITY_PERKS bonus array
// Keyed by bonus type so calcSkill/calcSaves/etc can look up what applies
let _deityBonuses = {
  skill_ability: [],   // { targets: ['str'], amount, bonusType, condition }
  skill:         [],   // { targets: ['climb', ...], amount, bonusType, condition }
  save:          [],   // { targets: ['fort','ref','will'], amount, bonusType, condition }
  attack:        [],   // { targets: ['weapon name'], amount, bonusType, condition }
  concentration: [],   // { targets: ['concentration'], amount, bonusType, condition }
  ac:            [],   // { targets: [...], amount, bonusType, condition }
};
let _deityBonusLabel = '';

function applyDeityBonuses(perkData, deityName) {
  // Reset
  Object.keys(_deityBonuses).forEach(k => _deityBonuses[k] = []);
  _deityBonusLabel = deityName;

  if (!perkData || !perkData.bonus) return;

  perkData.bonus.forEach(b => {
    const key = b.type;
    if (_deityBonuses[key] !== undefined) {
      _deityBonuses[key].push(b);
    }
  });

  // Recalculate affected totals
  calcSkills();
  calcSaves();
}

function getDeitySkillBonus(skillId, ability) {
  let total = 0;
  // skill_ability: bonus on all skills using this ability
  _deityBonuses.skill_ability.forEach(b => {
    if (b.targets.includes(ability)) total += b.amount;
  });
  // skill: bonus on specific skill ids
  _deityBonuses.skill.forEach(b => {
    if (b.targets.includes(skillId)) total += b.amount;
  });
  return total;
}

function getDeityConcentrationBonus() {
  return _deityBonuses.concentration.reduce((sum, b) => sum + b.amount, 0);
}

function calcSkill(id) {
  const skillDef = SKILLS.find(s => s[0] === id);
  if (!skillDef) return;
  const ability = skillDef[2];
  const abilMod = getEffectiveMod(ability);
  const ranks   = parseInt(val(`sk_ranks_${id}`)) || 0;
  const misc    = parseInt(val(`sk_misc_${id}`))  || 0;
  const isCS    = document.getElementById(`cs_${id}`).classList.contains('checked');
  const csBonus = (isCS && ranks > 0) ? 3 : 0;

  // Apply deity obedience bonus (typed, universal)
  const deityBonus = getDeitySkillBonus(id, ability);

  set(`sk_ability_${id}`, abilMod);
  set(`sk_total_${id}`, abilMod + ranks + misc + csBonus + deityBonus);

  // Show deity bonus in the Bon. column
  const bonusTag = document.getElementById(`sk_bonus_${id}`);
  if (bonusTag) {
    if (deityBonus > 0) {
      bonusTag.textContent = `+${deityBonus}`;
      bonusTag.title = `${_deityBonusLabel} obedience (${_deityBonuses.skill_ability[0]?.bonusType || 'sacred'})`;
    } else {
      bonusTag.textContent = '';
    }
  }

  // Row highlight
  const row = document.querySelector(`tr[data-skill="${id}"]`);
  if (row) row.classList.toggle('obedience-bonus', deityBonus > 0);
}

function calcSkills() {
  SKILLS.forEach(([id]) => calcSkill(id));
}

// ── WEAPONS ────────────────────────────────────────────────────────
function buildMaterialOptions() {
  // Fallback list — always present even if equipment.js not yet uploaded to GitHub
  const defaultMaterials = [
    'Normal', 'Masterwork', 'Alchemical Silver', 'Cold Iron',
    'Adamantine', 'Mithral', 'Darkwood', 'Bone'
  ];
  const materials = (typeof WEAPON_MATERIALS !== 'undefined')
    ? Object.keys(WEAPON_MATERIALS)
    : defaultMaterials;
  return materials.map(m => `<option value="${m}">${m}</option>`).join('');
}

function getMaterialNote(i) {
  if (typeof WEAPON_MATERIALS === 'undefined') return { dmgMod: 0, note: '' };
  const mat = val(`wpn_material_${i}`) || 'Normal';
  return WEAPON_MATERIALS[mat] || { dmgMod: 0, note: '' };
}

function buildWeapons() {
  const container = document.getElementById('weapons-container');
  container.innerHTML = '';
  for (let i = 0; i < WEAPON_COUNT; i++) {
    container.innerHTML += `
      <div class="weapon-block">
        <div class="weapon-name-row">
          <label>Weapon <input type="text" id="wpn_name_${i}" class="wide" placeholder="e.g. Lucerne Hammer +1"></label>
          <label>Material
            <select id="wpn_material_${i}" class="wpn-material-select" onchange="calcWeapon(${i})" title="Special material affects damage and DR bypass">
              ${buildMaterialOptions()}
            </select>
          </label>
          <label>Crit <input type="text" id="wpn_crit_${i}" style="width:52px" placeholder="×3"></label>
          <label>Type <input type="text" id="wpn_type_${i}" style="width:36px" placeholder="B/P"></label>
          <label>Range <input type="text" id="wpn_range_${i}" style="width:44px" placeholder="melee"></label>
          <label>Ammo <input type="text" id="wpn_ammo_${i}" style="width:36px"></label>
        </div>
        <div class="weapon-breakdown-row">
          <span class="breakdown-label">Attack</span>
          <span class="breakdown-eq">=</span>
          <label class="bd-cell">BAB<br><input type="number" id="wpn_bab_${i}" class="num small-num" readonly></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Str/Dex<br><input type="number" id="wpn_abil_${i}" class="num small-num" readonly></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell" title="Type +1 for MW, +2/+3 etc for magic enhancement. This adds to BOTH attack and damage.">Enh/MW<br><input type="number" id="wpn_enh_${i}" class="num small-num" oninput="calcWeapon(${i})"></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Feats<br><input type="number" id="wpn_feat_${i}" class="num small-num" oninput="calcWeapon(${i})" title="Weapon Focus +1, Greater WF +1, etc."></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Misc<br><input type="number" id="wpn_misc_atk_${i}" class="num small-num" oninput="calcWeapon(${i})"></label>
          <span class="breakdown-op">=</span>
          <label class="bd-cell total-cell">Total<br><input type="text" id="wpn_atk_${i}" class="num small-num atk-total" readonly></label>
          <span id="wpn_atk_breakdown_${i}" class="wpn-breakdown"></span>
        </div>
        <div class="weapon-breakdown-row">
          <span class="breakdown-label">Damage</span>
          <span class="breakdown-eq">=</span>
          <label class="bd-cell">Weapon die<br><input type="text" id="wpn_dmg_dice_${i}" style="width:36px" placeholder="1d8" oninput="calcWeapon(${i})"></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell" title="×1.5 two-handed, ×0.5 off-hand">Str(×?)<br><input type="number" id="wpn_dmg_str_${i}" class="num small-num" readonly></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Enh.<br><input type="number" id="wpn_dmg_enh_${i}" class="num small-num" readonly></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Feats<br><input type="number" id="wpn_dmg_feat_${i}" class="num small-num" oninput="calcWeapon(${i})" title="Power Attack, Weapon Spec, etc."></label>
          <span class="breakdown-op">+</span>
          <label class="bd-cell">Misc<br><input type="number" id="wpn_dmg_misc_${i}" class="num small-num" oninput="calcWeapon(${i})"></label>
          <span class="breakdown-op">=</span>
          <label class="bd-cell total-cell">Total<br><input type="text" id="wpn_dmg_${i}" style="width:60px" class="atk-total" readonly placeholder="1d8+5"></label>
          <span id="wpn_dmg_breakdown_${i}" class="wpn-breakdown"></span>
          <span id="wpn_sacred_note_${i}" class="wpn-sacred-note"></span>
          <span id="wpn_material_note_${i}" class="wpn-material-note"></span>
        </div>
        <div class="weapon-flags-row">
          <label title="Auto-set for two-handed weapons"><input type="checkbox" id="wpn_twohanded_${i}" onchange="calcWeapon(${i})"> Two-handed (×1.5 Str)</label>
          <label><input type="checkbox" id="wpn_offhand_${i}" onchange="calcWeapon(${i})"> Off-hand (×½ Str)</label>
          <label title="Auto-set for ranged weapons"><input type="checkbox" id="wpn_ranged_${i}" onchange="calcWeapon(${i})"> Ranged (DEX to hit)</label>
          <label><input type="checkbox" id="wpn_mw_${i}" onchange="calcWeapon(${i})"> Masterwork (+1 atk)</label>
        </div>
      </div>`;
  }
}

function buildWands() {
  const container = document.getElementById('wands-container');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < WAND_COUNT; i++) {
    const div = document.createElement('div');
    div.className = 'wand-block';
    div.innerHTML = `
      <div class="wand-name-row">
        <input type="text" id="wand_name_${i}" class="wand-name-input"
               placeholder="e.g. Wand of Cure Moderate Wounds">
        <select id="wand_type_${i}" class="wand-type-select" onchange="onWandTypeChange(${i})">
          <option value="wand">Wand</option>
          <option value="staff">Staff</option>
          <option value="scroll">Scroll</option>
          <option value="rod">Rod</option>
          <option value="other">Other</option>
        </select>
        <label class="wand-cl-label">CL
          <input type="number" id="wand_cl_${i}" class="num small-num"
                 placeholder="3" min="1" max="20" oninput="calcWand(${i})">
        </label>
        <label class="wand-cl-label">Spell lvl
          <input type="number" id="wand_spelllvl_${i}" class="num small-num"
                 placeholder="1" min="0" max="9" oninput="calcWand(${i})">
        </label>
        <select id="wand_attack_type_${i}" class="wand-type-select" onchange="calcWand(${i})"
                title="Does this item require an attack roll?">
          <option value="none">No attack roll</option>
          <option value="ranged_touch">Ranged touch (ray)</option>
          <option value="melee_touch">Melee touch</option>
          <option value="ranged">Ranged attack</option>
        </select>
      </div>

      <div class="weapon-breakdown-row">
        <span class="breakdown-label">Attack</span>
        <span class="breakdown-eq">=</span>
        <label class="bd-cell">BAB<br>
          <input type="number" id="wand_bab_${i}" class="num small-num" readonly></label>
        <span class="breakdown-op">+</span>
        <label class="bd-cell" title="DEX for ranged touch/ranged, STR for melee touch">Str/Dex<br>
          <input type="number" id="wand_abil_${i}" class="num small-num" readonly></label>
        <span class="breakdown-op">+</span>
        <label class="bd-cell">Misc<br>
          <input type="number" id="wand_misc_atk_${i}" class="num small-num"
                 oninput="calcWand(${i})"></label>
        <span class="breakdown-op">=</span>
        <label class="bd-cell total-cell">Total<br>
          <input type="text" id="wand_atk_total_${i}" class="num small-num atk-total" readonly></label>
        <span id="wand_no_atk_note_${i}" class="wand-no-atk-note">— no attack roll required</span>
      </div>

      <div class="weapon-breakdown-row">
        <span class="breakdown-label">Save DC</span>
        <span class="breakdown-eq">=</span>
        <label class="bd-cell">10<br><span class="bd-fixed">10</span></label>
        <span class="breakdown-op">+</span>
        <label class="bd-cell">Spell lvl<br>
          <input type="number" id="wand_dc_spelllvl_${i}" class="num small-num" readonly></label>
        <span class="breakdown-op">+</span>
        <label class="bd-cell" title="Casting ability modifier of the original caster (usually in item description)">Cast.Abil<br>
          <input type="number" id="wand_dc_abil_${i}" class="num small-num"
                 oninput="calcWand(${i})" placeholder="0"></label>
        <span class="breakdown-op">+</span>
        <label class="bd-cell">Misc<br>
          <input type="number" id="wand_dc_misc_${i}" class="num small-num"
                 oninput="calcWand(${i})"></label>
        <span class="breakdown-op">=</span>
        <label class="bd-cell total-cell">DC<br>
          <input type="text" id="wand_dc_${i}" class="num small-num atk-total" readonly></label>
        <label class="bd-cell" style="margin-left:8px">Effect / Damage<br>
          <input type="text" id="wand_effect_${i}" style="width:100px"
                 placeholder="2d8+3, 4d6 fire…"></label>
        <label class="bd-cell">Duration<br>
          <input type="text" id="wand_duration_${i}" style="width:60px"
                 placeholder="1 min/CL…"></label>
      </div>

      <div class="wand-charges-row">
        <span class="wand-charges-label">Charges:</span>
        <input type="number" id="wand_charges_max_${i}" class="num small-num"
               placeholder="50" min="0" max="50" oninput="updateWandDots(${i})">
        <span class="mi-label">max</span>
        <input type="number" id="wand_charges_used_${i}" class="num small-num"
               placeholder="0" min="0" oninput="updateWandDots(${i})">
        <span class="mi-label">used</span>
        <span id="wand_remaining_${i}" class="mi-remaining"></span>
        <div id="wand_dots_${i}" class="wand-dots-inline mi-dots"></div>
      </div>

      <input type="text" id="wand_notes_${i}" class="wand-notes-input"
             placeholder="Notes: save type, duration details, when to use…">
    `;
    container.appendChild(div);
    calcWand(i);
  }
}

function onWandTypeChange(i) {
  calcWand(i);
}

function calcWand(i) {
  const attackType = val('wand_attack_type_' + i) || 'none';
  const bab    = parseInt(val('bab')) || 0;
  const strMod = getEffectiveMod('str');
  const dexMod = getEffectiveMod('dex');
  const misc   = parseInt(val('wand_misc_atk_' + i)) || 0;
  const spellLvl = parseInt(val('wand_spelllvl_' + i)) || 0;
  const dcAbil   = parseInt(val('wand_dc_abil_'  + i)) || 0;
  const dcMisc   = parseInt(val('wand_dc_misc_'  + i)) || 0;

  // Attack breakdown
  const noAtkEl   = document.getElementById('wand_no_atk_note_' + i);
  const atkTotEl  = document.getElementById('wand_atk_total_'   + i);
  const babEl     = document.getElementById('wand_bab_'         + i);
  const abilEl    = document.getElementById('wand_abil_'        + i);

  if (attackType === 'none') {
    if (noAtkEl)  noAtkEl.style.display  = '';
    if (atkTotEl) atkTotEl.closest('label').style.display = 'none';
    if (babEl)    babEl.closest('label').style.display    = 'none';
    if (abilEl)   abilEl.closest('label').style.display   = 'none';
  } else {
    if (noAtkEl)  noAtkEl.style.display  = 'none';
    if (atkTotEl) atkTotEl.closest('label').style.display = '';
    if (babEl)    babEl.closest('label').style.display    = '';
    if (abilEl)   abilEl.closest('label').style.display   = '';

    const abilMod = (attackType === 'melee_touch') ? strMod : dexMod;
    if (babEl)    babEl.value  = bab;
    if (abilEl)   abilEl.value = abilMod;
    const total = bab + abilMod + misc;
    if (atkTotEl) atkTotEl.value = total >= 0 ? '+' + total : '' + total;
  }

  // DC breakdown
  const dcSpellEl = document.getElementById('wand_dc_spelllvl_' + i);
  const dcTotEl   = document.getElementById('wand_dc_'          + i);
  if (dcSpellEl) dcSpellEl.value = spellLvl;
  const dc = 10 + spellLvl + dcAbil + dcMisc;
  if (dcTotEl) dcTotEl.value = dc > 10 ? dc : '—';
}

function calcAllWands() {
  for (let i = 0; i < WAND_COUNT; i++) calcWand(i);
}

function updateWandDots(i) { updateWandCharges(i); }

function updateWandCharges(i) {
  const max  = parseInt(val('wand_charges_max_'+i))  || 0;
  const used = parseInt(val('wand_charges_used_'+i)) || 0;
  const rem  = Math.max(0, max - used);
  const el   = document.getElementById('wand_remaining_'+i);
  if (!el) return;
  if (max > 0) {
    el.textContent = rem + ' left';
    el.className = 'wand-remaining-badge' +
      (rem === 0 ? ' wand-empty' : rem <= Math.ceil(max*0.2) ? ' wand-low' : '');
  } else {
    el.textContent = '';
  }
}

function useWandCharge(i) {
  const max  = parseInt(val('wand_charges_max_'  + i)) || 0;
  const used = parseInt(val('wand_charges_used_' + i)) || 0;
  if (used < max) {
    set('wand_charges_used_' + i, used + 1);
    updateWandDots(i);
  }
}




function calcWeapon(i) {
  const bab       = parseInt(val('bab'))               || 0;
  const strMod    = getEffectiveMod('str');
  const dexMod    = getEffectiveMod('dex');
  const enh       = parseInt(val(`wpn_enh_${i}`))      || 0;
  const feat      = parseInt(val(`wpn_feat_${i}`))     || 0;
  const miscAtk   = parseInt(val(`wpn_misc_atk_${i}`)) || 0;
  const dmgFeat   = parseInt(val(`wpn_dmg_feat_${i}`)) || 0;
  const dmgMisc   = parseInt(val(`wpn_dmg_misc_${i}`)) || 0;
  const chk = id => { const el = document.getElementById(id); return el ? el.checked : false; };
  const twoHanded = chk(`wpn_twohanded_${i}`);
  const offHand   = chk(`wpn_offhand_${i}`);
  const ranged    = chk(`wpn_ranged_${i}`);
  const mw        = chk(`wpn_mw_${i}`);
  const mwBonus   = (mw && enh === 0) ? 1 : 0;

  const atkAbil = ranged ? dexMod : strMod;
  let strMult = 1;
  if (twoHanded) strMult = 1.5;
  if (offHand)   strMult = 0.5;
  const strDmg = Math.floor(strMod * strMult);

  set(`wpn_bab_${i}`,     bab);
  set(`wpn_abil_${i}`,    atkAbil);
  set(`wpn_dmg_str_${i}`, strDmg);
  set(`wpn_dmg_enh_${i}`, enh);

  const atkTotal = bab + atkAbil + enh + mwBonus + feat + miscAtk;
  set(`wpn_atk_${i}`, atkTotal >= 0 ? `+${atkTotal}` : `${atkTotal}`);

  const matData  = getMaterialNote(i);
  const matDmg   = matData.dmgMod || 0;
  const dice     = val(`wpn_dmg_dice_${i}`) || '—';
  const dmgMod   = strDmg + enh + dmgFeat + dmgMisc + matDmg;
  set(`wpn_dmg_${i}`, dmgMod !== 0 ? `${dice}${dmgMod >= 0 ? '+' : ''}${dmgMod}` : dice);

  // ── Attack breakdown ───────────────────────────
  const atkBreakEl = document.getElementById(`wpn_atk_breakdown_${i}`);
  if (atkBreakEl) {
    const ap = [];
    ap.push(`BAB +${bab}`);
    if (atkAbil) ap.push(`${ranged?'DEX':'STR'} ${atkAbil>=0?'+':''}${atkAbil}`);
    if (enh)     ap.push(`Enh +${enh}`);
    if (mwBonus) ap.push('MW +1');
    if (feat)    ap.push(`Feat ${feat>=0?'+':''}${feat}`);
    if (miscAtk) ap.push(`Misc ${miscAtk>=0?'+':''}${miscAtk}`);
    atkBreakEl.textContent = ap.join(' · ');
  }

  // ── Damage breakdown ───────────────────────────
  const dmgBreakEl = document.getElementById(`wpn_dmg_breakdown_${i}`);
  if (dmgBreakEl) {
    const dp = [];
    const multLabel = twoHanded ? '×1½' : offHand ? '×½' : '';
    if (strDmg)  dp.push(`STR${multLabel} ${strDmg>=0?'+':''}${strDmg}`);
    if (enh)     dp.push(`Enh +${enh}`);
    if (dmgFeat) dp.push(`Feat +${dmgFeat}`);
    if (dmgMisc) dp.push(`Misc ${dmgMisc>=0?'+':''}${dmgMisc}`);
    if (matDmg)  dp.push(`${matData.note?.split('.')[0] || 'Mat'} ${matDmg>=0?'+':''}${matDmg}`);
    dmgBreakEl.textContent = dp.length ? dp.join(' · ') : '';
  }

  // Material note
  const matNoteEl = document.getElementById(`wpn_material_note_${i}`);
  if (matNoteEl) matNoteEl.textContent = matData.note ? `⚠ ${matData.note}` : '';

  // Sacred weapon comparison (Warpriest)
  const sacredNoteEl = document.getElementById(`wpn_sacred_note_${i}`);
  if (sacredNoteEl && typeof getSacredWeaponDie === 'function') {
    const level = parseInt(val('charLevel')) || 1;
    const sacredDie = getSacredWeaponDie(level);
    const wpnDice = val(`wpn_dmg_dice_${i}`) || '';
    if (wpnDice && sacredDie) {
      const diceRank = {'1d4':1,'1d6':2,'1d8':3,'1d10':4,'2d6':5,'1d12':5,'2d8':6,'2d10':7};
      const wpnRank    = diceRank[wpnDice]    || 0;
      const sacredRank = diceRank[sacredDie]  || 0;
      if (sacredRank > wpnRank) {
        sacredNoteEl.textContent = `✦ Sacred die ${sacredDie} > weapon die — use sacred`;
        sacredNoteEl.className = 'wpn-sacred-note sacred-better';
      } else {
        sacredNoteEl.textContent = `✦ Weapon die ${wpnDice} ≥ sacred die ${sacredDie} — keep weapon die`;
        sacredNoteEl.className = 'wpn-sacred-note weapon-better';
      }
    } else {
      sacredNoteEl.textContent = '';
    }
  }
}

function calcAllWeapons() {
  for (let i = 0; i < WEAPON_COUNT; i++) calcWeapon(i);
}

// ── AC ITEMS ───────────────────────────────────────────────────────
function buildACItems() {
  const tbody = document.getElementById('ac-items-tbody');
  tbody.innerHTML = '';
  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    tbody.innerHTML += `<tr>
      <td><input type="text"   id="aci_name_${i}"    oninput="calcACItems()"></td>
      <td><input type="number" id="aci_bonus_${i}"   class="num small-num" oninput="calcACItems()"></td>
      <td><input type="text"   id="aci_type_${i}"    style="width:72px" oninput="calcACItems()"></td>
      <td><input type="number" id="aci_maxdex_${i}"  class="num small-num"></td>
      <td><input type="number" id="aci_check_${i}"   class="num small-num" oninput="calcACItems()"></td>
      <td><input type="number" id="aci_sf_${i}"      class="num small-num" oninput="calcACItems()"></td>
      <td><input type="number" id="aci_wt_${i}"      class="num small-num" oninput="calcGear();calcACItems()"></td>
      <td><button class="enhance-btn" onclick="enhanceACItem(${i})" title="Add or change enhancement bonus">+Enh</button></td>
    </tr>`;
  }
}

function calcACItems() {
  let bonus = 0, check = 0, sf = 0, wt = 0;
  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    bonus += parseInt(val(`aci_bonus_${i}`)) || 0;
    check += parseInt(val(`aci_check_${i}`)) || 0;
    sf    += parseInt(val(`aci_sf_${i}`))    || 0;
    wt    += parseFloat(val(`aci_wt_${i}`))  || 0;
  }
  document.getElementById('ac_items_bonus_total').textContent = bonus;
  document.getElementById('ac_items_check_total').textContent = check;
  document.getElementById('ac_items_sf_total').textContent    = sf;
  document.getElementById('ac_items_wt_total').textContent    = wt;
  // Push armor bonus back to AC
  document.getElementById('ac_armor').value = bonus;
  calcAC();
}

// ── GEAR ───────────────────────────────────────────────────────────
function buildGear() {
  const tbody = document.getElementById('gear-tbody');
  tbody.innerHTML = '';
  for (let i = 0; i < GEAR_COUNT; i++) {
    tbody.innerHTML += `<tr>
      <td><input type="text"   id="gear_name_${i}" oninput="calcGear()"></td>
      <td><input type="number" id="gear_wt_${i}"   class="num small-num" oninput="calcGear()"></td>
    </tr>`;
  }
}

function calcGear() {
  let gearWt = 0;
  for (let i = 0; i < GEAR_COUNT; i++) {
    gearWt += parseFloat(val(`gear_wt_${i}`)) || 0;
  }
  const el = document.getElementById('gear_total_wt');
  if (el) el.textContent = gearWt.toFixed(1);

  // Total carried weight = AC items + gear
  let acWt = 0;
  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    acWt += parseFloat(val(`aci_wt_${i}`)) || 0;
  }
  const totalWt = gearWt + acWt;

  // Update carry weight display and thresholds
  if (typeof getCarryCapacity !== 'undefined') {
    const str = parseInt(val('str_score')) || 10;
    const itemBonus = parseInt(document.getElementById('item_bonus_str')?.value || '0') || 0;
    const cap = getCarryCapacity(str + itemBonus, val('size') || 'Medium');
    set('load_light',  cap.light);
    set('load_medium', cap.medium);
    set('load_heavy',  cap.heavy);

    // Show current load status
    const loadEl = document.getElementById('current_load_status');
    if (loadEl) {
      const status = totalWt === 0 ? `Light (0 lbs)` :
                     totalWt <= cap.light  ? `Light (${totalWt.toFixed(0)} lbs)` :
                     totalWt <= cap.medium ? `Medium (${totalWt.toFixed(0)} lbs)` :
                     totalWt <= cap.heavy  ? `Heavy (${totalWt.toFixed(0)} lbs)` :
                                             `Overloaded! (${totalWt.toFixed(0)} lbs)`;
      loadEl.textContent = status;
      loadEl.className = 'load-status ' + (totalWt <= cap.light ? 'load-light' :
                          totalWt <= cap.medium ? 'load-medium' :
                          totalWt <= cap.heavy  ? 'load-heavy' : 'load-over');
    }
  }
}

// ── HP HELPER ──────────────────────────────────────────────────────
function updateHP() {
  // placeholder for future HP bar feature
}

// ── CALC ALL ───────────────────────────────────────────────────────
function calcAll() {
  ['str','dex','con','int','wis','cha'].forEach(a => calcMod(a));
  calcAllWeapons();
  calcAllWands();
}

// ── HELPERS ────────────────────────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function set(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function getEffectiveMod(ability) {
  // If a manual temp score is set, use that (overrides everything)
  const tempScore = val(`${ability}_temp`);
  if (tempScore !== '') {
    const ts = parseInt(tempScore);
    if (!isNaN(ts)) return abilityMod(ts);
  }
  // Base score + item bonus (e.g. Belt of Giant Strength +2)
  const score = parseInt(val(`${ability}_score`)) || 0;
  const itemBonus = parseInt(document.getElementById('item_bonus_'+ability)?.value || '0') || 0;
  return abilityMod(score + itemBonus);
}

// ── COLLECT ALL DATA ───────────────────────────────────────────────
/* ══════════════════════════════════════════════════
   SAVE / LOAD — single unified collectData and populateData
   All fields collected and restored in one place.
   ══════════════════════════════════════════════════ */

function collectData() {
  const data = {};

  // ── Simple text/number fields ──────────────────
  const simpleFields = [
    'charName','alignment','player','charClass','charLevel','deity','homeland',
    'race','size','gender','age','height','weight','hair','eyes',
    'str_score','dex_score','con_score','int_score','wis_score','cha_score',
    'str_temp','dex_temp','con_temp','int_temp','wis_temp','cha_temp',
    'hp_max','hp_current','hp_nonlethal','dr',
    'init_misc',
    'ac_armor','ac_shield','ac_size','ac_natural','ac_deflect','ac_misc',
    'fort_base','fort_magic','fort_misc','fort_temp',
    'ref_base','ref_magic','ref_misc','ref_temp',
    'will_base','will_magic','will_misc','will_temp',
    'bab','spell_res',
    'cmb_size','cmb_misc','cmd_size',
    'speed_land','speed_armor','speed_fly','speed_maneuv',
    'speed_swim','speed_climb','speed_burrow',
    'languages','languages_custom','skill_conditional','_applied_race',
    'money_pp','money_gp','money_sp','money_cp',
    'xp_current','xp_next',
    'special_abilities','notes',
    'load_light','load_medium','load_heavy',
    // Spell meta
    'spell_ability','caster_level','domain_school','spell_conditional','spell_list',
    // Traits
    'trait1_name','trait2_name',
    // Pages 3-5
    'formulae_book','campaign_notes',
  ];

  simpleFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });

  // ── Skills ─────────────────────────────────────
  data.skills = {};
  if (typeof SKILLS !== 'undefined') {
    SKILLS.forEach(([id]) => {
      const dot = document.getElementById(`cs_${id}`);
      data.skills[id] = {
        cs:    dot ? dot.classList.contains('checked') : false,
        ranks: val(`sk_ranks_${id}`),
        misc:  val(`sk_misc_${id}`),
      };
    });
  }

  // ── Weapons ────────────────────────────────────
  data.weapons = [];
  for (let i = 0; i < WEAPON_COUNT; i++) {
    const matEl = document.getElementById(`wpn_material_${i}`);
    data.weapons.push({
      name:      val(`wpn_name_${i}`),
      material:  matEl ? matEl.value : 'Normal',
      crit:      val(`wpn_crit_${i}`),
      type:      val(`wpn_type_${i}`),
      range:     val(`wpn_range_${i}`),
      ammo:      val(`wpn_ammo_${i}`),
      enh:       val(`wpn_enh_${i}`),
      feat:      val(`wpn_feat_${i}`),
      miscAtk:   val(`wpn_misc_atk_${i}`),
      dmgDice:   val(`wpn_dmg_dice_${i}`),
      dmgFeat:   val(`wpn_dmg_feat_${i}`),
      dmgMisc:   val(`wpn_dmg_misc_${i}`),
      twoHanded: !!(document.getElementById(`wpn_twohanded_${i}`) && document.getElementById(`wpn_twohanded_${i}`).checked),
      offHand:   !!(document.getElementById(`wpn_offhand_${i}`)   && document.getElementById(`wpn_offhand_${i}`).checked),
      ranged:    !!(document.getElementById(`wpn_ranged_${i}`)    && document.getElementById(`wpn_ranged_${i}`).checked),
      mw:        !!(document.getElementById(`wpn_mw_${i}`)        && document.getElementById(`wpn_mw_${i}`).checked),
      notes:     val(`wpn_notes_${i}`),
    });
  }

  // ── Wands ──────────────────────────────────────
  data.wands = [];
  for (let i = 0; i < WAND_COUNT; i++) {
    const typeSel = document.getElementById(`wand_type_${i}`);
    const atkSel  = document.getElementById(`wand_attack_type_${i}`);
    data.wands.push({
      name:        val(`wand_name_${i}`),
      type:        typeSel ? typeSel.value : 'wand',
      cl:          val(`wand_cl_${i}`),
      spelllvl:    val(`wand_spelllvl_${i}`),
      attackType:  atkSel  ? atkSel.value  : 'none',
      miscAtk:     val(`wand_misc_atk_${i}`),
      dcAbil:      val(`wand_dc_abil_${i}`),
      dcMisc:      val(`wand_dc_misc_${i}`),
      effect:      val(`wand_effect_${i}`),
      duration:    val(`wand_duration_${i}`),
      chargesMax:  val(`wand_charges_max_${i}`),
      chargesUsed: val(`wand_charges_used_${i}`),
      notes:       val(`wand_notes_${i}`),
    });
  }

  // ── AC Items ───────────────────────────────────
  data.acItems = [];
  for (let i = 0; i < AC_ITEM_COUNT; i++) {
    data.acItems.push({
      name:   val(`aci_name_${i}`),
      bonus:  val(`aci_bonus_${i}`),
      type:   val(`aci_type_${i}`),
      maxDex: val(`aci_maxdex_${i}`),
      check:  val(`aci_check_${i}`),
      sf:     val(`aci_sf_${i}`),
      wt:     val(`aci_wt_${i}`),
      props:  val(`aci_props_${i}`),
    });
  }

  // ── Gear ───────────────────────────────────────
  data.gear = [];
  for (let i = 0; i < GEAR_COUNT; i++) {
    data.gear.push({
      name: val(`gear_name_${i}`),
      wt:   val(`gear_wt_${i}`),
    });
  }

  // ── Feats ──────────────────────────────────────
  data.feats_structured = [];
  for (let i = 0; i < 30; i++) {
    const name = val(`feat_name_${i}`);
    const desc = val(`feat_desc_${i}`);
    const type = val(`feat_type_${i}`);
    const wpn  = val(`feat_wpn_${i}`);
    if (name || desc) data.feats_structured.push({ name, desc, type, wpn });
  }

  // ── Magic Items ────────────────────────────────
  data.magicItems = [];
  for (let i = 0; i < MAGIC_ITEM_COUNT; i++) {
    data.magicItems.push({
      name:        val(`mi_name_${i}`),
      chargesMax:  val(`mi_charges_max_${i}`),
      chargesUsed: val(`mi_charges_used_${i}`),
    });
  }

  // ── Alchemist (bombs, mutagen, discoveries) ──────
  data.alchemist = {
    bombUsed:    val('bomb_used')    || '0',
    bombTotal:   val('bomb_total')   || '0',
    mutagenType: (document.querySelector('input[name="mutagen_type"]:checked') || {}).value || '',
    mutagenActive: document.getElementById('mutagen_active')?.checked || false,
    discoveries: Array.from({length: 20}, (_, i) => val('discovery_' + i) || ''),
  };

  // ── Rage (Barbarian/Bloodrager) ─────────────────
  data.rage = {
    used:   val('rage_used')  || '0',
    total:  val('rage_total') || '0',
    powers: Array.from({length: 10}, (_, i) => val('rage_power_' + i) || ''),
  };

  // ── Blessings / class-specific (page 3) ────────
  data.blessings = {
    b1name:  val('blessing1_name'),  b1minor: val('blessing1_minor'), b1major: val('blessing1_major'),
    b2name:  val('blessing2_name'),  b2minor: val('blessing2_minor'), b2major: val('blessing2_major'),
    sacredWeaponName:    val('sacred_weapon_name'),
    sacredWeaponEnh:     val('sacred_weapon_enh'),
    sacredWeaponDmg:     val('sacred_weapon_dmg'),
    sacredWeaponSpecial: val('sacred_weapon_special'),
    sacredArmorName:     val('sacred_armor_name'),
    sacredArmorEnh:      val('sacred_armor_enh'),
    sacredArmorSpecial:  val('sacred_armor_special'),
    weaponFocus:         val('weapon_focus'),
    classNotes:          val('class_notes'),
  };

  // ── Resource pools ─────────────────────────────
  data.resourcePools = [];
  for (let i = 0; i < RESOURCE_POOL_COUNT; i++) {
    const dots   = document.getElementById(`pool_dots_${i}`);
    const filled = dots ? dots.querySelectorAll('.pool-dot.filled').length : 0;
    data.resourcePools.push({
      label:  val(`pool_label_${i}`),
      max:    val(`pool_max_${i}`),
      filled: filled,
    });
  }

  // ── Daily abilities ────────────────────────────
  data.dailyAbilities = [];
  for (let i = 0; i < DAILY_ABILITY_COUNT; i++) {
    data.dailyAbilities.push({
      name: val(`daily_name_${i}`),
      max:  val(`daily_max_${i}`),
      used: val(`daily_used_${i}`),
    });
  }

  // ── Spell levels (page 4) ──────────────────────
  data.spellLevels = [];
  for (let lvl = 0; lvl <= 9; lvl++) {
    const rows = [];
    const container = document.getElementById('sbrows_' + lvl);
    if (container) {
      container.querySelectorAll('.srow').forEach((row, i) => {
        const nameEl = row.querySelector('.srow-name');
        const prepEl = row.querySelector('.srow-prep');
        rows.push({
          name: nameEl ? nameEl.value : '',
          prep: prepEl ? prepEl.checked : false,
        });
      });
    }
    data.spellLevels.push({
      perday: val(`spl_perday_${lvl}`),
      bonus:  val(`spl_bonus_${lvl}`),
      rows:   rows,
      // legacy compat
      names:  rows.map(r => r.name),
    });
  }

  // ── My Actions (cheatsheet) ────────────────────
  data.myActions = [];
  for (let i = 0; i < MY_ACTIONS_COUNT; i++) {
    data.myActions.push({
      name:  val(`act_name_${i}`),
      type:  val(`act_type_${i}`),
      roll:  val(`act_roll_${i}`),
      notes: val(`act_notes_${i}`),
    });
  }

  // ── Buff tracker ───────────────────────────────
  data.buffs = [];
  for (let i = 0; i < BUFF_TRACKER_COUNT; i++) {
    data.buffs.push({
      name:     val(`buff_name_${i}`),
      effect:   val(`buff_effect_${i}`),
      duration: val(`buff_duration_${i}`),
    });
  }

  // ── Deity bonus state ──────────────────────────
  data._deityBonusKey  = (typeof _deityBonusLabel !== 'undefined') ? _deityBonusLabel : '';
  data._deityBonuses   = (typeof _deityBonuses    !== 'undefined') ? JSON.stringify(_deityBonuses) : '';

  data._version = '3.3';
  return data;
}

function populateData(data) {
  // ── Simple fields ──────────────────────────────
  Object.entries(data).forEach(([id, value]) => {
    if (typeof value !== 'string') return;
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  // ── Skills ─────────────────────────────────────
  if (data.skills && typeof SKILLS !== 'undefined') {
    SKILLS.forEach(([id]) => {
      const s = data.skills[id];
      if (!s) return;
      const dot = document.getElementById(`cs_${id}`);
      if (dot) dot.classList.toggle('checked', !!s.cs);
      set(`sk_ranks_${id}`, s.ranks || '');
      set(`sk_misc_${id}`,  s.misc  || '');
      calcSkill(id);
    });
  }

  // ── Weapons ────────────────────────────────────
  if (data.weapons) {
    data.weapons.forEach((w, i) => {
      if (i >= WEAPON_COUNT) return;
      set(`wpn_name_${i}`,      w.name     || '');
      set(`wpn_crit_${i}`,      w.crit     || '');
      set(`wpn_type_${i}`,      w.type     || '');
      set(`wpn_range_${i}`,     w.range    || '');
      set(`wpn_ammo_${i}`,      w.ammo     || '');
      set(`wpn_enh_${i}`,       w.enh      || '');
      set(`wpn_feat_${i}`,      w.feat     || '');
      set(`wpn_misc_atk_${i}`,  w.miscAtk  || '');
      set(`wpn_dmg_dice_${i}`,  w.dmgDice  || '');
      set(`wpn_dmg_feat_${i}`,  w.dmgFeat  || '');
      set(`wpn_dmg_misc_${i}`,  w.dmgMisc  || '');
      set(`wpn_notes_${i}`,     w.notes    || '');
      const matEl = document.getElementById(`wpn_material_${i}`);
      if (matEl && w.material) {
        // Try immediate set, then retry after short delay for dynamically built selects
        matEl.value = w.material;
        if (matEl.value !== w.material) {
          setTimeout(() => {
            const el2 = document.getElementById(`wpn_material_${i}`);
            if (el2) { el2.value = w.material; calcWeapon(i); }
          }, 200);
        }
      }
      const setChk = (id, v) => { const el = document.getElementById(id); if (el) { el.checked = !!v; el.disabled = false; } };
      setChk(`wpn_twohanded_${i}`, w.twoHanded);
      setChk(`wpn_offhand_${i}`,   w.offHand);
      setChk(`wpn_ranged_${i}`,    w.ranged);
      setChk(`wpn_mw_${i}`,        w.mw);
      calcWeapon(i);
    });
  }

  // ── Wands ──────────────────────────────────────
  if (data.wands) {
    data.wands.forEach((w, i) => {
      if (i >= WAND_COUNT) return;
      set(`wand_name_${i}`,         w.name        || '');
      set(`wand_cl_${i}`,           w.cl          || '');
      set(`wand_spelllvl_${i}`,     w.spelllvl    || '');
      set(`wand_misc_atk_${i}`,     w.miscAtk     || '');
      set(`wand_dc_abil_${i}`,      w.dcAbil      || '');
      set(`wand_dc_misc_${i}`,      w.dcMisc      || '');
      set(`wand_effect_${i}`,       w.effect      || '');
      set(`wand_duration_${i}`,     w.duration    || '');
      set(`wand_charges_max_${i}`,  w.chargesMax  || '');
      set(`wand_charges_used_${i}`, w.chargesUsed || '');
      set(`wand_notes_${i}`,        w.notes       || '');
      const typeSel = document.getElementById(`wand_type_${i}`);
      if (typeSel && w.type) typeSel.value = w.type;
      const atkSel = document.getElementById(`wand_attack_type_${i}`);
      if (atkSel && w.attackType) atkSel.value = w.attackType;
      updateWandDots(i);
      calcWand(i);
    });
  }

  // ── AC Items ───────────────────────────────────
  if (data.acItems) {
    data.acItems.forEach((a, i) => {
      set(`aci_name_${i}`,    a.name   || '');
      set(`aci_type_${i}`,    a.type   || '');
      set(`aci_maxdex_${i}`,  a.maxDex || '');
      set(`aci_check_${i}`,   a.check  || '');
      set(`aci_sf_${i}`,      a.sf     || '');
      set(`aci_wt_${i}`,      a.wt     || '');
      set(`aci_props_${i}`,   a.props  || '');
      // If bonus is missing/zero but item name is known armor, auto-lookup
      const savedBonus = a.bonus !== undefined && a.bonus !== '' && a.bonus !== '0'
        ? a.bonus : null;
      if (savedBonus) {
        set(`aci_bonus_${i}`, savedBonus);
      } else if (a.name && typeof ARMOR !== 'undefined') {
        // Try to find in ARMOR database
        const armorKey = Object.keys(ARMOR).find(k =>
          k.toLowerCase() === (a.name || '').toLowerCase() ||
          (a.name || '').toLowerCase().startsWith(k.toLowerCase())
        );
        if (armorKey) {
          const armorData = ARMOR[armorKey];
          set(`aci_bonus_${i}`, (armorData.acBonus || armorData.bonus || 0));
          if (!a.maxDex && armorData.maxDex !== undefined)
            set(`aci_maxdex_${i}`, armorData.maxDex);
          if (!a.check)
            set(`aci_check_${i}`, armorData.checkPen || armorData.check || '');
          if (!a.sf)
            set(`aci_sf_${i}`, armorData.spellFail || armorData.sf || '');
          if (!a.type)
            set(`aci_type_${i}`, armorData.armorType || armorData.type || '');
        } else {
          set(`aci_bonus_${i}`, a.bonus || '');
        }
      } else {
        set(`aci_bonus_${i}`, a.bonus || '');
      }
    });
    calcACItems();
  }

  // ── Gear ───────────────────────────────────────
  if (data.gear) {
    data.gear.forEach((g, i) => {
      set(`gear_name_${i}`, g.name || '');
      set(`gear_wt_${i}`,   g.wt   || '');
    });
    calcGear();
  }

  // ── Feats ──────────────────────────────────────
  if (data.feats_structured && typeof buildAdaptivePage2 === 'function') {
    const classKey = (val('charClass') || '').toLowerCase();
    const level    = parseInt(val('charLevel')) || 1;
    buildAdaptivePage2(classKey, level);
    // Restore feats then recalc all bonuses
    setTimeout(() => {
      restoreFeatData(data.feats_structured);
      setTimeout(() => {
        updateWeaponFeatBonuses();
        calcAllWeapons();
      }, 150);
    }, 200);
  }

  // ── Magic Items ────────────────────────────────
  if (data.magicItems) {
    data.magicItems.forEach((m, i) => {
      set(`mi_name_${i}`,         m.name        || '');
      set(`mi_charges_max_${i}`,  m.chargesMax  || '');
      set(`mi_charges_used_${i}`, m.chargesUsed || '');
      updateMagicItemDots(i);
    });
  }

  // ── Blessings ──────────────────────────────────
  if (data.alchemist) {
    const a = data.alchemist;
    setTimeout(() => {
      set('bomb_used',  a.bombUsed  || '0');
      set('bomb_total', a.bombTotal || '0');
      if (a.mutagenType) {
        const radio = document.querySelector(`input[name="mutagen_type"][value="${a.mutagenType}"]`);
        if (radio) radio.checked = true;
      }
      const mcheck = document.getElementById('mutagen_active');
      if (mcheck) { mcheck.checked = a.mutagenActive || false; updateMutagenState(mcheck.checked); }
      (a.discoveries || []).forEach((d, i) => {
        if (d) { set('discovery_' + i, d); onDiscoveryType(i, val('charClass')?.toLowerCase()); }
      });
      updateBombBar();
    }, 400);
  }

  if (data.rage) {
    set('rage_used',  data.rage.used  || '0');
    set('rage_total', data.rage.total || '0');
    (data.rage.powers || []).forEach((p, i) => {
      if (p) { set('rage_power_' + i, p); onRagePowerType(i); }
    });
    updateRageBar();
  }

  if (data.blessings) {
    const b = data.blessings;
    set('blessing1_name',  b.b1name  || ''); set('blessing1_minor', b.b1minor || ''); set('blessing1_major', b.b1major || '');
    set('blessing2_name',  b.b2name  || ''); set('blessing2_minor', b.b2minor || ''); set('blessing2_major', b.b2major || '');
    // Re-render blessing details from saved names
    setTimeout(() => {
      const cls = (val('charClass') || '').toLowerCase();
      if (cls.includes('warpriest')) {
        const level = parseInt(val('charLevel')) || 1;
        const container = document.getElementById('class-specific-block');
        buildBlessingsBlock(container, level);
      }
    }, 300);
    set('sacred_weapon_name',    b.sacredWeaponName    || '');
    set('sacred_weapon_enh',     b.sacredWeaponEnh     || '');
    set('sacred_weapon_dmg',     b.sacredWeaponDmg     || '');
    set('sacred_weapon_special', b.sacredWeaponSpecial || '');
    if (b.sacredArmorName)    set('sacred_armor_name',    b.sacredArmorName);
    if (b.sacredArmorEnh)     set('sacred_armor_enh',     b.sacredArmorEnh);
    if (b.sacredArmorSpecial) set('sacred_armor_special', b.sacredArmorSpecial);
    if (b.weaponFocus)        set('weapon_focus',         b.weaponFocus);
    if (b.classNotes)         set('class_notes',          b.classNotes);
  }

  // ── Resource pools ─────────────────────────────
  if (data.resourcePools) {
    data.resourcePools.forEach((p, i) => {
      set(`pool_label_${i}`, p.label || '');
      set(`pool_max_${i}`,   p.max   || '');
      updatePoolDots(i);
      const dotsEl = document.getElementById(`pool_dots_${i}`);
      if (dotsEl && p.filled) {
        dotsEl.querySelectorAll('.pool-dot').forEach((dot, d) => {
          dot.classList.toggle('filled', d < p.filled);
        });
      }
    });
  }

  // ── Daily abilities ────────────────────────────
  if (data.dailyAbilities) {
    data.dailyAbilities.forEach((a, i) => {
      set(`daily_name_${i}`, a.name || '');
      set(`daily_max_${i}`,  a.max  || '');
      set(`daily_used_${i}`, a.used || '');
    });
  }

  // ── Spell levels ───────────────────────────────
  if (data.spellLevels) {
    // Restore after page 4 is built (500ms delay)
    setTimeout(() => {
      data.spellLevels.forEach((s, lvl) => {
        set(`spl_perday_${lvl}`, s.perday || '');
        set(`spl_bonus_${lvl}`,  s.bonus  || '');
        // Support both old format (names[]) and new format (rows[])
        const entries = s.rows || (s.names || []).map(n => ({ name: n, prep: false }));
        entries.forEach((entry, i) => {
          const name = typeof entry === 'string' ? entry : (entry.name || '');
          const prep = typeof entry === 'object' ? (entry.prep || false) : false;
          if (!name) return;
          // Write to new spell block inputs
          const nameEl = document.getElementById(`sname_${lvl}_${i}`);
          const prepEl = document.getElementById(`sprep_${lvl}_${i}`);
          if (nameEl) {
            nameEl.value = name;
            if (prep && prepEl) { prepEl.checked = true; nameEl.classList.add('spell-prepared'); }
            // Show spell details
            const spell = typeof SPELLS_DB !== 'undefined'
              ? SPELLS_DB.find(sp => sp.name.toLowerCase() === name.toLowerCase())
              : null;
            const detailEl = document.getElementById(`sdetail_${lvl}_${i}`);
            if (detailEl) showSpellDetail(detailEl, spell);
          }
        });
      });
    }, 600);
  }

  // ── My Actions ─────────────────────────────────
  if (data.myActions) {
    data.myActions.forEach((a, i) => {
      set(`act_name_${i}`,  a.name  || '');
      set(`act_type_${i}`,  a.type  || '');
      set(`act_roll_${i}`,  a.roll  || '');
      set(`act_notes_${i}`, a.notes || '');
    });
  }

  // ── Buffs ──────────────────────────────────────
  if (data.buffs) {
    data.buffs.forEach((b, i) => {
      set(`buff_name_${i}`,     b.name     || '');
      set(`buff_effect_${i}`,   b.effect   || '');
      set(`buff_duration_${i}`, b.duration || '');
    });
  }

  // ── Formulae / campaign notes ──────────────────
  set('formulae_book',  data.formulae_book  || '');
  set('campaign_notes', data.campaign_notes || '');

  // ── Deity bonus ────────────────────────────────
  if (data._deityBonusKey && data._deityBonuses) {
    try {
      _deityBonusLabel = data._deityBonusKey;
      _deityBonuses    = JSON.parse(data._deityBonuses);
      calcSkills();
    } catch(e) {}
  }

  // ── Language picker ────────────────────────────
  const raceKey = data._applied_race;
  const race = (raceKey && typeof RACES !== 'undefined') ? RACES[raceKey] : null;
  if (typeof buildLanguagePicker === 'function') {
    buildLanguagePicker(race ? race.languages : [], race ? race.bonusLanguages : []);
  }
  if (data.languages && typeof restoreLanguagePicker === 'function') {
    restoreLanguagePicker(data.languages);
  }

  // ── Traits ─────────────────────────────────────
  setTimeout(restoreTraitDescriptions, 200);

  // ── Recalc everything ──────────────────────────
  calcAll();
  setTimeout(() => {
    syncItemRegistry();
    calcAllWeapons();
    calcACItems();
    calcAC();
    updateWeaponFeatBonuses();
    // Refill spell slots now that item bonuses (headband etc.) are applied
    const ck = (val('charClass') || '').toLowerCase();
    const lv = parseInt(val('charLevel')) || 1;
    if (ck) fillSpellSlots(ck, lv);
  }, 500);
  calcSaves();
  calcCombat();
  calcACItems();
  calcGear();
}

/* ══════════════════════════════════════════════════
   SETUP BAR TOGGLE
   ══════════════════════════════════════════════════ */
function toggleSetupBar() {
  const content = document.getElementById('setup-panels-content');
  const arrow   = document.getElementById('setup-toggle-arrow');
  if (!content) return;
  const hidden = content.style.display === 'none';
  content.style.display = hidden ? '' : 'none';
  if (arrow) arrow.textContent = hidden ? '▲ hide' : '▼ show';
  try { localStorage.setItem('pf1_setup_hidden', hidden ? '0' : '1'); } catch(e) {}
}

// Restore setup bar state on load
document.addEventListener('DOMContentLoaded', () => {
  try {
    const hidden = localStorage.getItem('pf1_setup_hidden');
    if (hidden === '1') {
      const content = document.getElementById('setup-panels-content');
      const arrow   = document.getElementById('setup-toggle-arrow');
      if (content) content.style.display = 'none';
      if (arrow)   arrow.textContent = '▼ show';
    }
  } catch(e) {}
});

/* ══════════════════════════════════════════════════
   SPELL PREPARED CHECKBOXES
   Adds a ✓ checkbox per spell name on page 4
   ══════════════════════════════════════════════════ */
// Override the spell name inputs with prepared checkbox version
// Done by patching buildSpellsPage after-the-fact via CSS and DOM

// After page 4 content is injected, wrap spell names with prepared toggle
function addPreparedCheckboxes() {
  document.querySelectorAll('[id^="spl_name_"]').forEach(input => {
    if (input.dataset.prepWrapped) return;
    input.dataset.prepWrapped = '1';

    const wrap = document.createElement('div');
    wrap.className = 'spell-name-wrap';
    input.parentNode.insertBefore(wrap, input);

    const cb = document.createElement('input');
    cb.type  = 'checkbox';
    cb.className = 'spell-prep-cb';
    cb.title = 'Prepared';
    cb.id    = input.id + '_prep';
    cb.onchange = () => {
      input.classList.toggle('spell-prepared', cb.checked);
    };

    wrap.appendChild(cb);
    wrap.appendChild(input);
  });
}

// Patch buildPage4Spells to call addPreparedCheckboxes after render
const _buildPage4SpellsOrig = buildPage4Spells;
buildPage4Spells = function(classKey, level) {
  _buildPage4SpellsOrig(classKey, level);
  setTimeout(addPreparedCheckboxes, 100);
};

/* ══════════════════════════════════════════════════
   MATERIAL CHANGE AFTER QUICK-FILL
   Weapon material select is not disabled — but
   applyWeaponLookup must not overwrite material
   if user already changed it
   ══════════════════════════════════════════════════ */
// Fix: material select should always be enabled
// The issue was calcWeapon re-reading material but select might be missing
// Ensure material selects are always enabled after buildWeapons
const _buildWeaponsOrig2 = buildWeapons;
buildWeapons = function() {
  _buildWeaponsOrig2();
  // Ensure all material selects are enabled
  document.querySelectorAll('[id^="wpn_material_"]').forEach(sel => {
    sel.disabled = false;
  });
  updateSlotCountDisplay();
};

/* ══════════════════════════════════════════════════
   SETUP EVENT HANDLERS + APPLY SETUP
   ══════════════════════════════════════════════════ */

function onRaceChange()  { showSetupInfo(); }
function onClassChange() { showSetupInfo(); }
function onLevelChange() { showSetupInfo(); }
function onSizeChange()  {}

function onDeityChange() {
  const el = document.getElementById('setup_deity');
  if (el && el.value) set('deity', el.value);
  showSetupInfo();
}

function showSetupInfo() {
  const info = document.getElementById('setup-info');
  if (!info) return;
  const raceKey  = (document.getElementById('setup_race')  || {}).value || '';
  const classKey = (document.getElementById('setup_class') || {}).value || '';
  const level    = parseInt((document.getElementById('setup_level') || {}).value || '1') || 1;
  const deityEl  = document.getElementById('setup_deity');
  const race = (typeof RACES   !== 'undefined') ? RACES[raceKey]   : null;
  const cls  = (typeof CLASSES !== 'undefined') ? CLASSES[classKey] : null;
  let html = '';

  if (race) {
    const modStr = Object.entries(race.abilityMods)
      .filter(([,v]) => v !== 0)
      .map(([k,v]) => (v>0?'+':'')+v+' '+k.toUpperCase()).join(', ');
    if (modStr) html += `<span class="setup-info-tag">📊 ${modStr}</span>`;
    html += `<span class="setup-info-tag">👁 ${race.vision}</span>`;
    html += `<span class="setup-info-tag">🗣 ${race.languages.join(', ')}</span>`;
  }
  if (cls) {
    const bab   = typeof getBAB        !== 'undefined' ? getBAB(classKey,level)        : '?';
    const saves = typeof getClassSaves !== 'undefined' ? getClassSaves(classKey,level) : {fort:'?',ref:'?',will:'?'};
    html += `<span class="setup-info-tag">⚔ BAB +${bab}</span>`;
    html += `<span class="setup-info-tag">💛 Fort +${saves.fort} / Ref +${saves.ref} / Will +${saves.will}</span>`;
    html += `<span class="setup-info-tag">🎲 HD d${cls.hd} · ${cls.skillsPerLevel} skills/lvl</span>`;
    if (cls.spellAbility) html += `<span class="setup-info-tag">✨ Spells: ${cls.spellAbility.toUpperCase()}</span>`;
    const xp = typeof getXPForLevel !== 'undefined' ? getXPForLevel(level) : 0;
    if (xp) html += `<span class="setup-info-tag">📈 XP to next: ${xp.toLocaleString()}</span>`;
    const bf = typeof getBonusFeatCount !== 'undefined' ? getBonusFeatCount(classKey,level) : 0;
    if (bf>0) html += `<span class="setup-info-tag">🏅 ${bf} bonus feat${bf>1?'s':''}</span>`;
  }
  if (deityEl && deityEl.value) {
    const dn  = deityEl.value;
    const row = typeof DEITIES !== 'undefined' ? DEITIES.find(d=>d[0]===dn) : null;
    if (row) {
      html += `<span class="setup-info-tag">⚔ Favored weapon: <strong>${row[3]}</strong></span>`;
      html += `<span class="setup-info-tag">🏛 ${row[2]}</span>`;
    }
    const perk = typeof DEITY_PERKS !== 'undefined' ? DEITY_PERKS[dn] : null;
    if (perk) {
      // Show shortened perk — extract the key bonus (e.g. "+4 sacred bonus on STR checks")
      const shortPerk = perk.perk.length > 45 ? perk.perk.substring(0, 45) + '…' : perk.perk;
      html += `<span class="setup-info-tag deity-perk" title="Perk: ${perk.perk}&#10;Obedience: ${perk.obedience}">🙏 ${shortPerk}</span>`;
    }
  }
  info.innerHTML = html || '<span class="setup-info-tag" style="opacity:.5">Select race, class and deity to see details</span>';
}

function applySetup() {
  const raceKey  = (document.getElementById('setup_race')  || {}).value || '';
  const classKey = (document.getElementById('setup_class') || {}).value || '';
  const level    = parseInt((document.getElementById('setup_level') || {}).value) || 1;
  const deityEl  = document.getElementById('setup_deity');
  const race = typeof RACES   !== 'undefined' ? RACES[raceKey]   : null;
  const cls  = typeof CLASSES !== 'undefined' ? CLASSES[classKey] : null;

  if (!race && !cls) { alert('Select at least a race or class first.'); return; }

  // Deity
  if (deityEl && deityEl.value) set('deity', deityEl.value);

  // Class
  if (cls) {
    set('charClass', cls.name);
    set('charLevel', level);
    set('bab', typeof getBAB !== 'undefined' ? getBAB(classKey,level) : 0);
    const saves = typeof getClassSaves !== 'undefined' ? getClassSaves(classKey,level) : {fort:0,ref:0,will:0};
    set('fort_base', saves.fort);
    set('ref_base',  saves.ref);
    set('will_base', saves.will);
    if (cls.spellAbility) set('spell_ability', cls.spellAbility.toUpperCase());
    set('caster_level', level);
    // XP needed to reach NEXT level
    const xp = typeof getXPForLevel !== 'undefined' ? getXPForLevel(level + 1) : 0;
    if (xp) set('xp_next', xp);
    if (cls.classSkills) markClassSkills(cls.classSkills);
  }

  // Race
  if (race) {
    set('race', race.name);

    // Idempotent ability mods
    const prevKey  = val('_applied_race');
    const prevRace = prevKey && typeof RACES !== 'undefined' ? RACES[prevKey] : null;
    ['str','dex','con','int','wis','cha'].forEach(ab => {
      const raw = val(ab+'_score');
      if (raw === '') return;
      let score = parseInt(raw) || 0;
      if (prevRace && prevKey !== raceKey) score -= (prevRace.abilityMods[ab] || 0);
      const mod = race.abilityMods[ab] || 0;
      if (prevKey !== raceKey && mod !== 0) { score += mod; set(ab+'_score', score); }
    });
    set('_applied_race', raceKey);

    // Size + speed
    set('size', race.size);
    const sizeEl = document.getElementById('setup_size');
    if (sizeEl) sizeEl.value = race.size;
    set('speed_land',  race.speed);
    set('speed_armor', race.size === 'Small' ? race.speed : Math.max(0, race.speed - 10));

    // Languages
    if (typeof buildLanguagePicker === 'function')
      buildLanguagePicker(race.languages, race.bonusLanguages || []);

    // Racial traits
    const traitText = (race.traits || []).join('\n');
    let sa = val('special_abilities');
    const marker = '--- Racial Traits ---';
    if (sa.includes(marker)) sa = sa.substring(0, sa.indexOf(marker)).trim();
    set('special_abilities', (sa ? sa + '\n\n' : '') + marker + '\n' + traitText);
  }

  // Warpriest: auto-apply Weapon Focus as bonus feat at level 1
  if (classKey === 'warpriest' && level >= 1) {
    // Weapon Focus applies to sacred/favored weapon
    // Find first empty feat slot and fill with Weapon Focus
    // Also set +1 attack bonus on weapon slot 0 if it has a weapon
    const wf = typeof getFeatByName !== 'undefined' ? getFeatByName('Weapon Focus') : null;
    if (wf) {
      // Check if Weapon Focus already in feats
      let hasWF = false;
      for (let fi = 0; fi < 30; fi++) {
        if ((val('feat_name_' + fi) || '').toLowerCase().includes('weapon focus')) {
          hasWF = true; break;
        }
      }
      if (!hasWF) {
        // Find first empty feat slot
        for (let fi = 0; fi < 20; fi++) {
          if (!val('feat_name_' + fi)) {
            set('feat_name_' + fi, 'Weapon Focus');
            set('feat_desc_' + fi, wf.benefit || '+1 bonus on attack rolls with chosen weapon.');
            set('feat_type_' + fi, 'weapon');
            break;
          }
        }
      }
    }
  }

  // Deity perk
  if (deityEl && deityEl.value) {
    const perk = typeof DEITY_PERKS !== 'undefined' ? DEITY_PERKS[deityEl.value] : null;
    if (perk) {
      const sa = val('special_abilities');
      const note = `[Deity Obedience — ${deityEl.value}]\n${perk.perk}\n⚠ Requires: ${perk.obedience}`;
      if (!sa.includes('Deity Obedience')) set('special_abilities', sa ? sa+'\n\n'+note : note);
      applyDeityBonuses(perk, deityEl.value);
    }
  }

  // Recalculate
  calcAll(); calcSaves(); calcCombat();

  // Re-affirm fields that page rebuild might clobber
  if (race)  { set('race', race.name); set('speed_land', race.speed); }
  if (cls)   { set('charClass', cls.name); set('charLevel', level); }
  if (deityEl && deityEl.value) set('deity', deityEl.value);

  // Adaptive pages
  if (typeof afterApplySetup === 'function') afterApplySetup(classKey, level);

  alert('Setup applied! Check ability scores, class skills (dots), BAB and saves.');
}

function markClassSkills(classSkillIds) {
  document.querySelectorAll('.cs-dot').forEach(d => d.classList.remove('checked'));
  (classSkillIds || []).forEach(id => {
    const dot = document.getElementById('cs_'+id);
    if (dot) dot.classList.add('checked');
  });
  calcSkills();
}

function updateHPLevelupInfo(classKey, level) {
  const info = document.getElementById('hp-levelup-info');
  const hint = document.getElementById('hp-levelup-hint');
  const cls  = typeof CLASSES !== 'undefined' ? CLASSES[classKey] : null;
  if (!cls || !info) return;
  const conMod = getEffectiveMod('con');
  const hd = cls.hd;
  info.style.display = '';
  info.innerHTML = `
    <span class="hp-info-tag">HD: d${hd}</span>
    <span class="hp-info-tag">CON mod: ${conMod>=0?'+':''}${conMod}</span>
    <span class="hp-info-tag">Per level: max ${hd+conMod} · avg ${Math.floor(hd/2)+1+conMod}</span>
  `;
  if (hint) hint.textContent = `d${hd} + CON mod per level`;
}

/* ══════════════════════════════════════════════════
   ADAPTIVE PAGE 2 — Class Abilities + Feats
   ══════════════════════════════════════════════════ */

let _currentClass = '';
let _currentLevel = 1;

function getRegularFeatCount(level) {
  let count = 1;
  for (let l = 3; l <= level; l += 2) count++;
  return count;
}

function afterApplySetup(classKey, level) {
  _currentClass = classKey;
  _currentLevel = level;
  updateHPLevelupInfo(classKey, level);
  buildFeatsSection(classKey, level);
  buildClassAbilitiesSection(classKey, level);
  buildClassSpecificBlock(classKey, level);
  buildPage4Spells(classKey, level);
  fillResourcePools(classKey, level);
  fillSpellSlots(classKey, level);
  if (classKey === 'warpriest') buildBlessingsBlock();
  renderRacialTraitCards();
  renderDeityObedienceCard();
  renderSpecialAbilityCards();
  showSpontaneousCasting(classKey);
  showXPLevelSummary(classKey, level);
}



function showSpontaneousCasting(classKey) {
  // Spontaneous casting is shown on page 4 only — keep row hidden on page 3
  const row = document.getElementById('spontaneous-casting-row');
  if (row) row.style.display = 'none';
  // Also show on spell page (page 4) with full cure spell list
  const p4note = document.getElementById('p4-spontaneous-note');
  if (p4note) {
    const fullInfo = getSpontaneousCastingFull(classKey);
    if (fullInfo) { p4note.style.display = ''; p4note.innerHTML = fullInfo; }
    else { p4note.style.display = 'none'; }
  }
}

function getSpontaneousCastingFull(classKey) {
  const cureLevels = {
    1: { name: 'Cure Light Wounds',        effect: '1d8+CL (max +5)',              clMin: 1  },
    2: { name: 'Cure Moderate Wounds',     effect: '2d8+CL (max +10)',             clMin: 3  },
    3: { name: 'Cure Serious Wounds',      effect: '3d8+CL (max +15)',             clMin: 5  },
    4: { name: 'Cure Critical Wounds',     effect: '4d8+CL (max +20)',             clMin: 7  },
    5: { name: 'Cure Light Wounds, Mass',  effect: '1d8+1/lvl per target (max+25)',clMin: 9  },
    6: { name: 'Cure Moderate Wounds, Mass',effect:'2d8+1/lvl per target (max+30)',clMin: 11 },
  };
  const inflictLevels = {
    1: 'Inflict Light Wounds (1d8+CL, max +5)',
    2: 'Inflict Moderate Wounds (2d8+CL, max +10)',
    3: 'Inflict Serious Wounds (3d8+CL, max +15)',
    4: 'Inflict Critical Wounds (4d8+CL, max +20)',
    5: 'Inflict Light Wounds, Mass',
    6: 'Inflict Moderate Wounds, Mass',
  };
  if (['cleric','warpriest','inquisitor','shaman'].includes(classKey)) {
    const playerLevel = typeof val !== 'undefined' ? (parseInt(val('charLevel')) || 0) : 0;
    const rows = Object.entries(cureLevels)
      .map(([sl, s]) => {
        const available = playerLevel >= s.clMin;
        const style = available ? '' : 'opacity:0.4';
        return `<tr style="${style}">
          <td class="sc-lvl">${sl}</td>
          <td class="sc-spell">${s.name}</td>
          <td class="sc-effect">${s.effect}</td>
          <td class="sc-cl" title="Minimum caster level">CL ${s.clMin}+</td>
        </tr>`;
      }).join('');
    return `<div class="spont-cast-block">
      <div class="spont-cast-title">⚡ Spontaneous Casting — Cure Spells</div>
      <div class="spont-cast-note">Sacrifice any prepared spell to cast the Cure spell of the same level or lower. No need to prepare these separately.</div>
      <table class="spont-cast-table">${rows}</table>
    </div>`;
  }
  if (classKey === 'druid') {
    return `<div class="spont-cast-block">
      <div class="spont-cast-title">⚡ Spontaneous Casting — Summon Nature's Ally</div>
      <div class="spont-cast-note">Sacrifice any prepared spell to cast Summon Nature's Ally of the same level or lower.</div>
    </div>`;
  }
  return null;
}

function showXPLevelSummary(classKey, level) {
  // Fill xp_next field
  const xpNext = typeof getXPForLevel !== 'undefined' ? getXPForLevel(level + 1) : 0;
  if (xpNext) set('xp_next', xpNext);

  // Update progress bar
  updateXPBar();

  // Show inline level note
  const el = document.getElementById('xp-level-summary');
  if (!el) return;
  if (!xpNext) { el.style.display = 'none'; return; }
  el.style.display = '';
  el.textContent = `Level ${level} → ${level+1} needs ${xpNext.toLocaleString()} XP`;
}

function updateXPBar() {
  const current = parseInt(val('xp_current')) || 0;
  const next    = parseInt(val('xp_next'))    || 0;
  const bar     = document.getElementById('xp-progress-bar');
  const pct     = document.getElementById('xp-pct');
  if (!bar) return;
  const p = next > 0 ? Math.min(100, Math.round((current / next) * 100)) : 0;
  bar.style.width = p + '%';
  if (pct) pct.textContent = next > 0 ? p + '%' : '';
}

function getSpontaneousCasting(classKey) {
  const SL = (txt) => `<span class="spont-label">⚡ Spontaneous Casting:</span> ${txt}`;
  const map = {
    warpriest:  SL('Sacrifice any prepared spell to cast a <em>Cure</em> spell of the same level or lower. Cure spells: CLW (1), CMW (2), CSW (3), CCW (4), CLW Mass (5), CMW Mass (6).'),
    cleric:     SL('Sacrifice any prepared spell to cast a <em>Cure</em> (good/neutral) or <em>Inflict</em> (evil) spell of the same level or lower.'),
    druid:      SL("Sacrifice any prepared spell to cast a <em>Summon Nature's Ally</em> spell of the same level or lower."),
    oracle:     SL('Oracle casts spontaneously from known spells — no sacrifice needed.'),
    sorcerer:   SL('Sorcerer casts spontaneously from known spells — no sacrifice needed.'),
    bard:       SL('Bard casts spontaneously from known spells — no sacrifice needed.'),
    inquisitor: SL('Good inquisitors can convert to <em>Cure</em> spells, evil to <em>Inflict</em> spells.'),
    shaman:     SL('Sacrifice any prepared spell to cast a <em>Cure</em> spell of the same level or lower.'),
  };
  return map[classKey] || null;
}

function getSpellTable(classKey) {
  const tables = {
    // ── PREPARED DIVINE ─────────────────────────────────────────
    cleric: {
      1:[3,0,0,0,0,0,0,0,0], 2:[4,0,0,0,0,0,0,0,0], 3:[4,1,0,0,0,0,0,0,0], 4:[4,2,0,0,0,0,0,0,0],
      5:[4,2,1,0,0,0,0,0,0], 6:[4,3,2,0,0,0,0,0,0], 7:[4,3,2,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0],
      9:[4,3,3,2,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,3,2,0,0,0],
      13:[4,3,3,3,3,2,1,0,0], 14:[4,3,3,3,3,3,2,0,0], 15:[4,3,3,3,3,3,2,1,0], 16:[4,3,3,3,3,3,3,2,0],
      17:[4,3,3,3,3,3,3,2,1], 18:[4,3,3,3,3,3,3,3,2], 19:[4,3,3,3,3,3,3,3,3], 20:[4,3,3,3,3,3,3,3,3],
    },
    druid: {
      1:[3,0,0,0,0,0,0,0,0], 2:[4,0,0,0,0,0,0,0,0], 3:[4,1,0,0,0,0,0,0,0], 4:[4,2,0,0,0,0,0,0,0],
      5:[4,2,1,0,0,0,0,0,0], 6:[4,3,2,0,0,0,0,0,0], 7:[4,3,2,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0],
      9:[4,3,3,2,1,0,0,0,0], 10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,3,2,0,0,0],
      13:[4,3,3,3,3,2,1,0,0], 14:[4,3,3,3,3,3,2,0,0], 15:[4,3,3,3,3,3,2,1,0], 16:[4,3,3,3,3,3,3,2,0],
      17:[4,3,3,3,3,3,3,2,1], 18:[4,3,3,3,3,3,3,3,2], 19:[4,3,3,3,3,3,3,3,3], 20:[4,3,3,3,3,3,3,3,3],
    },
    warpriest: {
      1:[1,0,0,0,0,0], 2:[2,0,0,0,0,0], 3:[3,0,0,0,0,0], 4:[3,1,0,0,0,0],
      5:[4,2,0,0,0,0], 6:[4,3,0,0,0,0], 7:[4,3,1,0,0,0], 8:[4,4,2,0,0,0],
      9:[5,4,3,0,0,0], 10:[5,4,3,1,0,0], 11:[5,4,4,2,0,0], 12:[5,5,4,3,0,0],
      13:[5,5,4,3,1,0], 14:[5,5,4,4,2,0], 15:[5,5,5,4,3,0], 16:[5,5,5,5,4,0],
      17:[5,5,5,5,4,1], 18:[5,5,5,5,4,2], 19:[5,5,5,5,4,3], 20:[5,5,5,5,4,4],
    },
    paladin: {
      1:[0,0,0,0], 2:[0,0,0,0], 3:[0,0,0,0], 4:[1,0,0,0],
      5:[1,0,0,0], 6:[1,0,0,0], 7:[1,1,0,0], 8:[1,1,0,0],
      9:[2,1,0,0], 10:[2,1,0,0], 11:[2,1,1,0], 12:[2,1,1,0],
      13:[3,2,1,0], 14:[3,2,1,0], 15:[3,2,1,1], 16:[3,2,2,1],
      17:[4,3,2,1], 18:[4,3,2,2], 19:[4,3,3,2], 20:[4,3,3,3],
    },
    inquisitor: {
      1:[2,0,0,0,0,0], 2:[3,0,0,0,0,0], 3:[4,0,0,0,0,0], 4:[4,1,0,0,0,0],
      5:[4,2,0,0,0,0], 6:[4,3,0,0,0,0], 7:[4,3,1,0,0,0], 8:[4,3,2,0,0,0],
      9:[4,3,3,0,0,0], 10:[4,3,3,1,0,0], 11:[4,3,3,2,0,0], 12:[4,3,3,3,0,0],
      13:[4,3,3,3,1,0], 14:[4,3,3,3,2,0], 15:[4,3,3,3,3,0], 16:[4,3,3,3,3,1],
      17:[4,3,3,3,3,2], 18:[4,3,3,3,3,3], 19:[4,3,3,3,3,3], 20:[4,3,3,3,3,3],
    },
    ranger: {
      1:[0,0,0,0], 2:[0,0,0,0], 3:[0,0,0,0], 4:[1,0,0,0],
      5:[1,0,0,0], 6:[1,0,0,0], 7:[1,1,0,0], 8:[1,1,0,0],
      9:[2,1,0,0], 10:[2,1,0,0], 11:[2,1,1,0], 12:[2,1,1,0],
      13:[3,2,1,0], 14:[3,2,1,0], 15:[3,2,1,1], 16:[3,2,2,1],
      17:[4,3,2,1], 18:[4,3,2,2], 19:[4,3,3,2], 20:[4,3,3,3],
    },
    // ── PREPARED ARCANE ─────────────────────────────────────────
    wizard: {
      1:[3,0,0,0,0,0,0,0,0], 2:[4,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0], 4:[4,3,0,0,0,0,0,0,0],
      5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0], 7:[4,4,3,2,0,0,0,0,0], 8:[4,4,3,3,0,0,0,0,0],
      9:[4,4,4,3,2,0,0,0,0], 10:[4,4,4,3,3,0,0,0,0], 11:[4,4,4,4,3,2,0,0,0], 12:[4,4,4,4,3,3,0,0,0],
      13:[4,4,4,4,4,3,2,0,0], 14:[4,4,4,4,4,3,3,0,0], 15:[4,4,4,4,4,4,3,2,0], 16:[4,4,4,4,4,4,3,3,0],
      17:[4,4,4,4,4,4,4,3,2], 18:[4,4,4,4,4,4,4,3,3], 19:[4,4,4,4,4,4,4,4,3], 20:[4,4,4,4,4,4,4,4,4],
    },
    magus: {
      1:[1,0,0,0,0,0], 2:[2,0,0,0,0,0], 3:[3,0,0,0,0,0], 4:[3,1,0,0,0,0],
      5:[4,2,0,0,0,0], 6:[4,3,0,0,0,0], 7:[4,3,1,0,0,0], 8:[4,3,2,0,0,0],
      9:[4,3,3,0,0,0], 10:[4,3,3,1,0,0], 11:[4,3,3,2,0,0], 12:[4,3,3,3,0,0],
      13:[4,3,3,3,1,0], 14:[4,3,3,3,2,0], 15:[4,3,3,3,3,0], 16:[4,3,3,3,3,1],
      17:[4,3,3,3,3,2], 18:[4,3,3,3,3,3], 19:[4,3,3,3,3,3], 20:[4,3,3,3,3,3],
    },
    // ── SPONTANEOUS ─────────────────────────────────────────────
    sorcerer: {
      1:[3,0,0,0,0,0,0,0,0], 2:[4,0,0,0,0,0,0,0,0], 3:[4,1,0,0,0,0,0,0,0], 4:[4,2,0,0,0,0,0,0,0],
      5:[4,2,1,0,0,0,0,0,0], 6:[4,3,2,0,0,0,0,0,0], 7:[4,3,2,1,0,0,0,0,0], 8:[4,4,3,2,0,0,0,0,0],
      9:[4,4,3,2,1,0,0,0,0], 10:[4,4,4,3,2,0,0,0,0], 11:[4,4,4,3,2,1,0,0,0], 12:[4,4,4,4,3,2,0,0,0],
      13:[4,4,4,4,3,2,1,0,0], 14:[4,4,4,4,4,3,2,0,0], 15:[4,4,4,4,4,3,2,1,0], 16:[4,4,4,4,4,4,3,2,0],
      17:[4,4,4,4,4,4,3,2,1], 18:[4,4,4,4,4,4,4,3,2], 19:[4,4,4,4,4,4,4,4,3], 20:[4,6,6,6,6,6,6,6,6],
    },
    bard: {
      1:[2,0,0,0,0,0], 2:[3,0,0,0,0,0], 3:[4,0,0,0,0,0], 4:[4,1,0,0,0,0],
      5:[4,2,0,0,0,0], 6:[4,3,0,0,0,0], 7:[4,3,1,0,0,0], 8:[4,3,2,0,0,0],
      9:[4,3,3,0,0,0], 10:[4,3,3,1,0,0], 11:[4,3,3,2,0,0], 12:[4,3,3,3,0,0],
      13:[4,3,3,3,1,0], 14:[4,3,3,3,2,0], 15:[4,3,3,3,3,0], 16:[4,3,3,3,3,1],
      17:[4,3,3,3,3,2], 18:[4,3,3,3,3,3], 19:[4,3,3,3,3,3], 20:[4,3,3,3,3,3],
    },
    // ── PREPARED/SPONTANEOUS HYBRID ─────────────────────────────
    alchemist: {
      1:[1,0,0,0,0,0], 2:[2,0,0,0,0,0], 3:[3,1,0,0,0,0], 4:[3,2,0,0,0,0],
      5:[4,3,1,0,0,0], 6:[4,3,2,0,0,0], 7:[4,4,2,1,0,0], 8:[4,4,3,2,0,0],
      9:[5,4,3,3,0,0], 10:[5,4,4,3,1,0], 11:[5,4,4,4,2,0], 12:[5,5,4,4,3,0],
      13:[5,5,4,4,4,1], 14:[5,5,4,4,4,2], 15:[5,5,5,4,4,3], 16:[5,5,5,4,4,4],
      17:[5,5,5,5,4,4], 18:[5,5,5,5,5,4], 19:[5,5,5,5,5,5], 20:[5,5,5,5,5,5],
    },
  };
  // Aliases — classes that use another class's spell table
  const aliases = {
    oracle:      'cleric',     // spontaneous cleric-list
    shaman:      'druid',      // prepared druid-list
    hunter:      'druid',      // druid list, 6-level
    arcanist:    'wizard',     // prepared wizard-list
    witch:       'wizard',     // prepared wizard-list
    investigator:'alchemist',  // alchemist extract table
    bloodrager:  'sorcerer',   // spontaneous, 4-level
    skald:       'bard',       // bard table
    summoner:    'sorcerer',   // spontaneous
    psychic:     'sorcerer',   // spontaneous
    mesmerist:   'bard',       // bard-like
    occultist:   'inquisitor', // 6-level prepared
    medium:      'inquisitor',
    spiritualist:'inquisitor',
    kineticist:  null,         // no spells
  };
  const key = aliases[classKey] !== undefined ? aliases[classKey] : classKey;
  if (!key) return null;
  return tables[key] || null;
}


function getBonusSpells(abilityMod, maxLevel) {
  // Returns array of bonus spells per spell level (index 0 = level 1)
  const bonus = [];
  for (let sl = 1; sl <= maxLevel; sl++) {
    bonus.push(abilityMod >= sl ? 1 : 0);  // simplified: +1 if mod >= spell level
    // Full bonus spell rules: +1 at mod 1-3, +2 at 4-6, etc. per level
    // This is the simplified version for display
  }
  return bonus;
}

function fillSpellSlots(classKey, level) {
  const table = getSpellTable(classKey);
  if (!table) return;
  const slots = table[level];
  if (!slots) return;

  const cls = typeof CLASSES !== 'undefined' ? CLASSES[classKey] : null;
  const spellAbility = (cls && cls.spellAbility) ? cls.spellAbility : val('spell_ability');
  const abMod = typeof getEffectiveMod !== 'undefined' ?
    getEffectiveMod(spellAbility.toLowerCase().substring(0,3)) : 0;

  for (let sl = 1; sl <= 9; sl++) {
    const base = slots[sl-1] || 0;
    if (!base) continue;
    // Full bonus spell rules per spell level
    // +1 bonus spell at mod 1-3, +2 at 4-6, etc.
    // Official PF1e bonus spells: +1 per level if mod >= level,
    // additional +1 for each 4 points mod exceeds level
    const bonusSpell = abMod >= sl ? 1 + Math.floor((abMod - sl) / 4) : 0;
    const capped = bonusSpell;
    // Calc DC: 10 + spell level + ability mod
    const dc = 10 + sl + abMod;
    // Write to spell overview table (HTML IDs: sp1_perday, sp1_bonus, sp1_dc)
    set(`sp${sl}_perday`, base);
    set(`sp${sl}_bonus`,  capped > 0 ? capped : '');
    set(`sp${sl}_dc`,     dc);
    // Also write to page 4 spell tracker IDs for compatibility
    set(`spl_perday_${sl}`, base);
    set(`spl_bonus_${sl}`,  capped > 0 ? capped : '');
  }
  // Show spontaneous casting — handled by showSpontaneousCasting()

  // Clear spell levels with no base slots
  for (let sl = 1; sl <= 9; sl++) {
    const base = slots[sl-1] || 0;
    if (!base) {
      set(`sp${sl}_perday`, '');
      set(`sp${sl}_bonus`, '');
      set(`sp${sl}_dc`, '');
    }
  }

  // Orisons (level 0) — unlimited, mark as ∞
  const orisonEl = document.getElementById('sp0_perday_0');
  if (orisonEl && !orisonEl.value) orisonEl.value = '∞';
}

function fillResourcePools(classKey, level) {
  if (typeof getResourcePools === 'undefined') return;
  const mods = {
    str: getEffectiveMod('str'), dex: getEffectiveMod('dex'),
    con: getEffectiveMod('con'), int: getEffectiveMod('int'),
    wis: getEffectiveMod('wis'), cha: getEffectiveMod('cha'),
  };
  const pools = getResourcePools(classKey, level, mods);
  pools.forEach((pool, i) => {
    if (i >= RESOURCE_POOL_COUNT) return;
    // Only fill if slot is empty or has the same label
    const existLabel = val('pool_label_' + i);
    if (!existLabel || existLabel === pool.label) {
      set('pool_label_' + i, pool.label);
      set('pool_max_' + i, pool.max);
      updatePoolDots(i);
    }
  });
}

function buildAdaptivePage2(classKey, level) {
  afterApplySetup(classKey, level);
}

function buildFeatsSection(classKey, level) {
  const container = document.getElementById('feats-container');
  if (!container) return;
  const regularFeats   = getRegularFeatCount(level);
  const bonusFeats     = typeof getBonusFeatCount !== 'undefined' ? getBonusFeatCount(classKey, level) : 0;
  const totalFeatSlots = regularFeats + bonusFeats;
  const label = document.getElementById('feat-count-label');
  if (label) label.textContent = `${regularFeats} regular + ${bonusFeats} bonus = ${totalFeatSlots} total at level ${level}`;

  const bonusFeatAbilities = typeof CLASS_ABILITIES !== 'undefined' ?
    (CLASS_ABILITIES[classKey] || []).filter(a => a.type==='bonus_feat' && a.level<=level).sort((a,b)=>a.level-b.level) : [];

  container.innerHTML = '';
  for (let i = 0; i < totalFeatSlots; i++) {
    const isBonus  = i >= regularFeats;
    const bonusIdx = i - regularFeats;
    const bonusAbil = isBonus ? bonusFeatAbilities[bonusIdx] : null;
    const gainedLevel = isBonus ? (bonusAbil ? bonusAbil.level : '?') : (i===0 ? 1 : 1+(i*2)-1);
    const existing = { name: val(`feat_name_${i}`), desc: val(`feat_desc_${i}`), type: val(`feat_type_${i}`), wpn: val(`feat_wpn_${i}`) };
    const isWeapon = existing.type === 'weapon';
    const div = document.createElement('div');
    div.className = 'feat-row' + (isBonus ? ' feat-bonus' : '');
    div.innerHTML = `
      <div class="feat-row-header">
        <span class="feat-level-badge ${isBonus?'feat-badge-bonus':'feat-badge-regular'}"
              title="${isBonus?(bonusAbil?.description||'Bonus feat'):`Regular feat (level ${gainedLevel})`}">
          ${isBonus?`B${bonusIdx+1}`:`L${gainedLevel}`}
        </span>
        <div class="feat-search-wrap" style="position:relative;flex:1;min-width:80px">
          <input type="text" id="feat_name_${i}" class="feat-name-input"
                 value="${(existing.name||'').replace(/"/g,'&quot;')}"
                 placeholder="${isBonus?'Bonus feat…':'Type to search feats…'}"
                 oninput="onFeatSearch(${i})" autocomplete="off">
          <div id="feat_suggestions_${i}" class="feat-suggestions" style="display:none"></div>
        </div>
        <select id="feat_type_${i}" class="feat-type-select" onchange="onFeatTypeChange(${i})">
          <option value=""       ${!existing.type?'selected':''}>—</option>
          <option value="combat" ${existing.type==='combat'?'selected':''}>Combat</option>
          <option value="weapon" ${existing.type==='weapon'?'selected':''}>Weapon</option>
          <option value="metamagic" ${existing.type==='metamagic'?'selected':''}>Metamagic</option>
          <option value="general"   ${existing.type==='general'?'selected':''}>General</option>
          <option value="item"      ${existing.type==='item'?'selected':''}>Item Creation</option>
        </select>
        <select id="feat_wpn_${i}" class="feat-wpn-select ${isWeapon?'':'hidden'}"
                title="Link to weapon slot" onchange="onFeatWeaponLink(${i})">
          <option value="">— weapon slot —</option>
          ${Array.from({length:WEAPON_COUNT},(_,w)=>`<option value="${w}" ${existing.wpn==w?'selected':''}>Weapon ${w+1}: ${val('wpn_name_'+w)||'(empty)'}</option>`).join('')}
        </select>
      </div>
      <input type="text" id="feat_desc_${i}" class="feat-desc-input"
             value="${(existing.desc||'').replace(/"/g,'&quot;')}"
             placeholder="Brief effect…">
    `;
    container.appendChild(div);
  }
}

function onFeatTypeChange(i) {
  const type = val('feat_type_'+i);
  const sel  = document.getElementById('feat_wpn_'+i);
  if (sel) sel.classList.toggle('hidden', type !== 'weapon');
}

function onFeatWeaponLink(i) { updateWeaponFeatBonuses(); }

function onFeatSearch(i) {
  const query = val('feat_name_'+i);
  const sug   = document.getElementById('feat_suggestions_'+i);
  if (!sug || typeof searchFeats === 'undefined' || query.length < 2) {
    if (sug) sug.style.display = 'none'; return;
  }
  const results = searchFeats(query);
  if (!results.length) { sug.style.display = 'none'; return; }
  sug.innerHTML = results.map(f => {
    const sn = f.name.replace(/'/g,"&#39;");
    return `<div class="feat-suggestion-item" onclick="selectFeat(${i},'${sn}')">
      <span class="feat-sug-name">${f.name}</span>
      <span class="feat-sug-type">${f.type}</span>
      <span class="feat-sug-benefit">${f.benefit.substring(0,60)}${f.benefit.length>60?'…':''}</span>
    </div>`;
  }).join('');
  sug.style.display = 'block';
}

function selectFeat(i, name) {
  name = name.replace(/&#39;/g,"'");
  set('feat_name_'+i, name);
  const feat = typeof getFeatByName !== 'undefined' ? getFeatByName(name) : null;
  if (feat) {
    set('feat_desc_'+i, feat.benefit);
    const ts = document.getElementById('feat_type_'+i);
    if (ts) {
      if (feat.weaponLinked) ts.value = 'weapon';
      else if (feat.type === 'metamagic') ts.value = 'metamagic';
      else if (feat.type === 'item_creation') ts.value = 'item';
      else if (feat.type === 'combat') ts.value = 'combat';
      else ts.value = 'general';
    }
    if (feat.weaponLinked) {
      const ws = document.getElementById('feat_wpn_'+i);
      if (ws) ws.classList.remove('hidden');
    }
    onFeatTypeChange(i);
  }
  const sug = document.getElementById('feat_suggestions_'+i);
  if (sug) sug.style.display = 'none';
  // Recalc all feat bonuses
  setTimeout(updateWeaponFeatBonuses, 50);
}

document.addEventListener('click', e => {
  if (!e.target.closest('.feat-search-wrap'))
    document.querySelectorAll('.feat-suggestions').forEach(el => el.style.display='none');
  if (!e.target.closest('.trait-search-wrap'))
    document.querySelectorAll('[id$="_suggestions"]').forEach(el => {
      if (el.id.startsWith('trait')) el.style.display='none';
    });
});

// Prevent trait suggestion div from closing on mousedown inside it
document.addEventListener('mousedown', e => {
  const sug = e.target.closest('[id$="_suggestions"]');
  if (sug && sug.id.startsWith('trait')) {
    e.preventDefault(); // prevent input blur which would close the dropdown
  }
});

function updateWeaponFeatBonuses() {
  const atkBonuses = Array(WEAPON_COUNT).fill(0);
  const dmgBonuses = Array(WEAPON_COUNT).fill(0);
  const saveBonuses = {fort:0, ref:0, will:0};
  let   initBonus  = 0;
  let   acBonus    = 0;

  for (let fi = 0; fi < 30; fi++) {
    const featName = val('feat_name_'+fi);
    if (!featName) continue;
    const feat = typeof getFeatByName !== 'undefined' ? getFeatByName(featName) : null;
    if (!feat) continue;

    // ── Weapon-linked feats (attack/damage) ───────
    // Skip conditional feats (Power Attack etc — user applies manually)
    if (feat.conditional) continue;

    const wpnSlot = val('feat_wpn_'+fi);
    if (wpnSlot !== '' && !isNaN(parseInt(wpnSlot))) {
      const si = parseInt(wpnSlot);
      if (feat.attackMod) atkBonuses[si] += feat.attackMod;
      if (feat.damageMod) dmgBonuses[si] += feat.damageMod;
    }

    // ── Save bonuses (Iron Will, Lightning Reflexes, Great Fortitude) ──
    if (feat.saveMod) {
      if (feat.saveMod.fort) saveBonuses.fort += feat.saveMod.fort;
      if (feat.saveMod.ref)  saveBonuses.ref  += feat.saveMod.ref;
      if (feat.saveMod.will) saveBonuses.will += feat.saveMod.will;
    }

    // ── Initiative bonus (Improved Initiative +4) ──
    if (feat.initMod) initBonus += feat.initMod;

    // ── AC bonus (Dodge +1) ───────────────────────
    if (feat.acMod) acBonus += feat.acMod;
  }

  // Apply weapon bonuses
  for (let wi = 0; wi < WEAPON_COUNT; wi++) {
    set('wpn_feat_'+wi,     atkBonuses[wi] || '');
    set('wpn_dmg_feat_'+wi, dmgBonuses[wi] || '');
    calcWeapon(wi);
  }

  // Apply save bonuses — store in feat_save_misc hidden fields
  // then add to the save misc fields
  ['fort','ref','will'].forEach(s => {
    const fieldId = s + '_misc';
    const el = document.getElementById(fieldId);
    if (!el) return;
    // Track feat contribution separately using data attribute
    const base = parseInt(el.dataset.noFeatBase !== undefined
      ? el.dataset.noFeatBase : el.value) || 0;
    if (el.dataset.noFeatBase === undefined) el.dataset.noFeatBase = el.value || '0';
    el.value = (parseInt(el.dataset.noFeatBase) || 0) + saveBonuses[s];
  });
  if (saveBonuses.fort || saveBonuses.ref || saveBonuses.will) calcSaves();

  // Apply initiative bonus
  if (initBonus) {
    const initEl = document.getElementById('init_misc');
    if (initEl) {
      if (initEl.dataset.noFeatBase === undefined) initEl.dataset.noFeatBase = initEl.value || '0';
      initEl.value = (parseInt(initEl.dataset.noFeatBase) || 0) + initBonus;
      calcInit();
    }
  }

  // Apply AC dodge bonus
  if (acBonus) {
    const acEl = document.getElementById('ac_misc');
    if (acEl) {
      if (acEl.dataset.noFeatBase === undefined) acEl.dataset.noFeatBase = acEl.value || '0';
      acEl.value = (parseInt(acEl.dataset.noFeatBase) || 0) + acBonus;
      calcAC();
    }
  }
}

function restoreFeatData(feats) {
  if (!feats) return;
  feats.forEach((f,i) => {
    set('feat_name_'+i, f.name||'');
    set('feat_desc_'+i, f.desc||'');
    set('feat_type_'+i, f.type||'');
    set('feat_wpn_'+i,  f.wpn ||'');
    onFeatTypeChange(i);
  });
  // Apply all feat bonuses after restoring
  setTimeout(updateWeaponFeatBonuses, 100);
}

function getClassAbilitiesForLevel(classKey, level) {
  if (typeof CLASS_ABILITIES === 'undefined') return [];
  const list = CLASS_ABILITIES[classKey] || [];
  return list.filter(a => a.level <= level).sort((a, b) => a.level - b.level);
}

function buildClassAbilitiesSection(classKey, level) {
  const container = document.getElementById('class-abilities-container');
  if (!container) return;
  const label = document.getElementById('class-abilities-label');
  const cls   = typeof CLASSES !== 'undefined' ? CLASSES[classKey] : null;
  if (label && cls) label.textContent = cls.name + ' level ' + level;

  const abilities = typeof getClassAbilitiesForLevel !== 'undefined' ?
    getClassAbilitiesForLevel(classKey, level) : [];
  if (!abilities.length) {
    container.innerHTML = '<p class="helper-text">Apply Setup to populate class abilities.</p>';
    return;
  }

  const features = typeof getClassFeatures !== 'undefined' ? getClassFeatures(classKey) : null;
  let html = '';
  if (features) {
    const sc = features.spellcasting, prof = features.proficiencies;
    html += `<div class="cf-block">
      <div class="cf-section-title">Class Features</div>
      <div class="cf-row"><span class="cf-label">Weapons</span><span class="cf-value">${prof.weapons}</span></div>
      <div class="cf-row"><span class="cf-label">Armor</span><span class="cf-value">${prof.armor}</span></div>
      ${sc ? `<div class="cf-row"><span class="cf-label">Spellcasting</span><span class="cf-value">${sc.type} · ${sc.ability} · max lvl ${sc.maxLevel}</span></div>` : ''}
      ${features.specialRules.slice(0,3).map(r=>`<div class="cf-row"><span class="cf-label">${r.name}</span><span class="cf-note">${r.text}</span></div>`).join('')}
    </div><div class="cf-divider"></div>`;
  }

  const groups = { resource:[], weapon:[], armor:[], active:[], passive:[] };
  abilities.forEach(a => { if (groups[a.type]) groups[a.type].push(a); });
  const seen = new Set();
  const addGroup = (list, cls, badge, label) => {
    if (!list.length) return '';
    let g = '<div class="ca-group">';
    list.forEach(a => {
      if (seen.has(a.name)) return; seen.add(a.name);
      const mods = {wis:getEffectiveMod('wis'),int:getEffectiveMod('int'),cha:getEffectiveMod('cha'),con:getEffectiveMod('con')};
      const pools = typeof getResourcePools!=='undefined' ? getResourcePools(classKey,level,mods) : [];
      const pool  = a.resource ? pools.find(p=>p.id===a.resource) : null;
      g += `<div class="ca-row ca-${cls}">
        <span class="ca-badge ca-badge-${cls}">${badge}</span>
        <span class="ca-name">${a.name}</span>
        <span class="ca-desc">${a.description}</span>
        ${pool ? `<span class="ca-pool-display">${pool.max}/day</span>` : ''}
      </div>`;
    });
    return g + '</div>';
  };
  html += addGroup(groups.resource, 'resource', 'Pool', 'Pool');
  html += addGroup(groups.weapon,   'weapon',   'Wpn',  'Weapon');
  html += addGroup(groups.armor,    'armor',    'Arm',  'Armor');
  html += addGroup(groups.active,   'active',   'Act',  'Active');
  html += addGroup(groups.passive,  'passive',  '—',    'Passive');
  container.innerHTML = html;
}

function buildClassSpecificBlock(classKey, level) {
  const container = document.getElementById('class-specific-block');
  if (!container) return;
  container.innerHTML = '';
  if (classKey === 'warpriest') {
    buildBlessingsBlock(container, level);
  }
  if (classKey === 'barbarian' || classKey === 'bloodrager') {
    buildRageBlock(container, classKey, level);
  }
  if (classKey === 'skald') {
    buildRageBlock(container, 'skald', level);
  }
  if (classKey === 'alchemist' || classKey === 'investigator') {
    buildAlchemistBlock(container, classKey, level);
  }
}

function buildRageBlock(container, classKey, level) {
  // Rage rounds per day: 4 + CON mod + (level-1)*2 for barbarian
  // Bloodrager: 4 + CON mod + (level-1)*2 as well
  const conMod = typeof getEffectiveMod !== 'undefined' ? getEffectiveMod('con') : 0;
  const isSkald = classKey === 'skald';
  const label = isSkald ? 'Inspired Rage' : 'Rage';

  // Rage rounds: barbarian gets 4+CON at level 1, +2 per level after
  const baseRounds = isSkald
    ? (3 + (typeof getEffectiveMod !== 'undefined' ? getEffectiveMod('cha') : 0) + (level * 2))
    : (4 + conMod + ((level - 1) * 2));

  // Rage bonuses
  const rageStr  = isSkald ? 2 : 4;
  const rageCon  = isSkald ? 2 : 4;
  const rageWill = isSkald ? 2 : 2;
  const rageAC   = isSkald ? 0 : -2;

  // Rage powers — one per 2 levels for barbarian
  const ragePowerCount = Math.floor(level / 2);

  const div = document.createElement('div');
  div.className = 'rage-block section-box';
  div.innerHTML = `
    <div class="section-title">${label}
      <span class="section-note">${baseRounds} rounds/day · Swift action to enter</span>
    </div>

    <!-- Rage tracker -->
    <div class="rage-tracker">
      <div class="rage-tracker-row">
        <label class="rage-field-label">Rounds used today
          <input type="number" id="rage_used" class="num rage-num" value="0" min="0"
                 max="${baseRounds}" oninput="updateRageBar()">
        </label>
        <span class="rage-slash">/</span>
        <label class="rage-field-label">Total rounds
          <input type="number" id="rage_total" class="num rage-num" value="${baseRounds}" readonly>
        </label>
        <div class="rage-bar-wrap">
          <div id="rage-bar" class="rage-bar" style="width:100%"></div>
        </div>
        <span id="rage-rounds-left" class="rage-left">${baseRounds} left</span>
      </div>
    </div>

    <!-- Rage bonuses reference -->
    <div class="rage-stats">
      <span class="rage-stat-label">While raging:</span>
      <span class="rage-stat">+${rageStr} STR</span>
      <span class="rage-stat">+${rageCon} CON</span>
      <span class="rage-stat">+${rageWill} Will saves</span>
      ${rageAC !== 0 ? `<span class="rage-stat rage-penalty">${rageAC} AC</span>` : ''}
      <span class="rage-stat">Cannot use Cha/Dex/Int skills or spells</span>
    </div>

    <!-- Rage powers -->
    ${ragePowerCount > 0 ? `
    <div class="rage-powers-section">
      <div class="rage-powers-title">Rage Powers (${ragePowerCount} total)</div>
      <div id="rage-powers-list" class="rage-powers-list">
        ${Array.from({length: ragePowerCount}, (_, i) => `
          <div class="rage-power-row">
            <input type="text" id="rage_power_${i}" class="rage-power-input"
                   placeholder="Rage power ${i+1}…"
                   oninput="onRagePowerType(${i})">
            <div class="rage-power-desc" id="rage_power_desc_${i}"></div>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Fatigue note -->
    <div class="rage-note">After raging: fatigued for twice as many rounds as you raged. Cannot re-enter rage while fatigued.</div>
  `;
  container.appendChild(div);
  updateRageBar();
}

function buildAlchemistBlock(container, classKey, level) {
  const intMod = typeof getEffectiveMod !== 'undefined' ? getEffectiveMod('int') : 0;
  const isInvestigator = classKey === 'investigator';

  // Bombs per day: level + INT mod (alchemist). Investigator: level/2 + INT mod
  const bombsPerDay = isInvestigator
    ? Math.floor(level / 2) + intMod
    : level + intMod;

  // Bomb damage: 1d6 per 2 alchemist levels (round up)
  const bombDice = Math.ceil(level / 2);
  const bombDmg  = `${bombDice}d6 + ${intMod > 0 ? '+' + intMod : intMod} fire`;

  // Discoveries: 1 per 2 levels (alch), 1 per 2 levels (inv = talents)
  const discoveryCount = Math.floor(level / 2);
  const discoveryLabel = isInvestigator ? 'Investigator Talents' : 'Discoveries';

  // Mutagen (alchemist only)
  const mutagenBonus = level >= 16 ? 8 : level >= 12 ? 6 : level >= 8 ? 4 : 2;
  const mutagenAC    = level >= 16 ? -4 : level >= 12 ? -3 : level >= 8 ? -2 : -2;
  const mutagenDur   = level + ' min';

  const div = document.createElement('div');
  div.className = 'alch-block section-box';
  div.innerHTML = `
    <div class="section-title">${isInvestigator ? 'Investigator' : 'Alchemist'} Resources</div>

    ${!isInvestigator ? `
    <!-- Bombs -->
    <div class="alch-resource-row">
      <div class="alch-resource-label">BOMBS</div>
      <div class="alch-resource-body">
        <div class="alch-stat-row">
          <span class="alch-stat">${bombsPerDay}/day</span>
          <span class="alch-stat">${bombDmg}</span>
          <span class="alch-stat">Range 20 ft (throw)</span>
          <span class="alch-stat">Reflex DC ${10 + Math.floor(level/2) + intMod} = half</span>
        </div>
        <div class="alch-tracker-row">
          <label class="alch-field-label">Used today
            <input type="number" id="bomb_used" class="num alch-num" value="0" min="0"
                   max="${bombsPerDay}" oninput="updateBombBar()">
          </label>
          <span class="rage-slash">/</span>
          <label class="alch-field-label">Total
            <input type="number" id="bomb_total" class="num alch-num"
                   value="${bombsPerDay}" readonly>
          </label>
          <div class="rage-bar-wrap">
            <div id="bomb-bar" class="rage-bar" style="width:100%;background:var(--accent2)"></div>
          </div>
          <span id="bomb-left" class="rage-left" style="color:var(--accent2)">${bombsPerDay} left</span>
        </div>
      </div>
    </div>

    <!-- Mutagen -->
    <div class="alch-resource-row">
      <div class="alch-resource-label">MUTAGEN</div>
      <div class="alch-resource-body">
        <div class="alch-stat-row">
          <span class="alch-stat">1/day · ${mutagenDur}</span>
          <span class="alch-stat">+${mutagenBonus} Str/Dex/Con</span>
          <span class="alch-stat">${mutagenAC} AC · −2 mental stat</span>
        </div>
        <div class="alch-mutagen-row">
          <span class="alch-field-label">Which stat:</span>
          <label><input type="radio" name="mutagen_type" value="str"> STR (+${mutagenBonus})</label>
          <label><input type="radio" name="mutagen_type" value="dex"> DEX (+${mutagenBonus})</label>
          <label><input type="radio" name="mutagen_type" value="con"> CON (+${mutagenBonus})</label>
          <input type="checkbox" id="mutagen_active" onchange="updateMutagenState(this.checked)">
          <label for="mutagen_active" style="font-size:9px;font-weight:700">Active</label>
        </div>
      </div>
    </div>` : `
    <!-- Inspiration (Investigator) -->
    <div class="alch-resource-row">
      <div class="alch-resource-label">INSPIRATION</div>
      <div class="alch-resource-body">
        <div class="alch-stat-row">
          <span class="alch-stat">${level + intMod} points/day</span>
          <span class="alch-stat">+1d6 to skill/attack</span>
          <span class="alch-stat">Free on trained INT/WIS skills</span>
        </div>
        <div class="alch-tracker-row">
          <label class="alch-field-label">Used
            <input type="number" id="bomb_used" class="num alch-num" value="0" min="0"
                   max="${level + intMod}" oninput="updateBombBar()">
          </label>
          <span class="rage-slash">/</span>
          <label class="alch-field-label">Total
            <input type="number" id="bomb_total" class="num alch-num"
                   value="${level + intMod}" readonly>
          </label>
          <div class="rage-bar-wrap">
            <div id="bomb-bar" class="rage-bar" style="width:100%;background:var(--accent2)"></div>
          </div>
          <span id="bomb-left" class="rage-left" style="color:var(--accent2)">${level + intMod} left</span>
        </div>
      </div>
    </div>`}

    <!-- Discoveries / Talents -->
    <div class="alch-resource-row">
      <div class="alch-resource-label">${discoveryLabel.toUpperCase()}</div>
      <div class="alch-resource-body">
        <div class="alch-discoveries">
          ${Array.from({length: discoveryCount}, (_, i) => `
            <div class="discovery-row">
              <input type="text" id="discovery_${i}" class="discovery-input"
                     placeholder="${isInvestigator ? 'Talent' : 'Discovery'} ${i+1}…"
                     oninput="onDiscoveryType(${i}, '${classKey}')">
              <div class="discovery-desc" id="discovery_desc_${i}"></div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);
  updateBombBar();
}

function updateBombBar() {
  const used  = parseInt(document.getElementById('bomb_used')?.value)  || 0;
  const total = parseInt(document.getElementById('bomb_total')?.value) || 1;
  const bar   = document.getElementById('bomb-bar');
  const left  = document.getElementById('bomb-left');
  if (!bar) return;
  const remaining = Math.max(0, total - used);
  const pct = Math.round((remaining / total) * 100);
  bar.style.width = pct + '%';
  if (left) left.textContent = remaining + ' left';
}

function updateMutagenState(active) {
  // Visual indicator when mutagen is active
  const block = document.querySelector('.alch-block');
  if (block) block.classList.toggle('mutagen-active', active);
}

function onDiscoveryType(i, classKey) {
  const input = document.getElementById('discovery_' + i);
  const desc  = document.getElementById('discovery_desc_' + i);
  if (!input || !desc) return;
  const query = input.value.trim().toLowerCase();
  if (!query || query.length < 2) { desc.innerHTML = ''; return; }

  const DISCOVERIES = {
    // Alchemist discoveries
    'acid bomb':         'Throw acid bomb dealing acid damage instead of fire. No splash damage.',
    'all-purpose mutagen': 'Mutagen provides +2 to Str, Dex, and Con but penalty to all mental stats.',
    'blinding bomb':     'Blind target for 1 round on direct hit (Ref neg). Splash: dazzled 1 round.',
    'cognatogen':        'Int/Wis/Cha mutagen: +4 mental stat, –2 physical, +2 natural armor.',
    'concussive bomb':   'Deafens on direct hit (Fort neg). Splash: deafened 1 round.',
    'curse bomb':        'Bestow curse effect on target hit. Will neg.',
    'delayed bomb':      'Plant a bomb set to detonate in up to CL rounds on command.',
    'demolition charge': 'Prepare a bomb that deals triple damage to objects/constructs.',
    'directed bomb':     'Splash only damages squares you choose, not all adjacent.',
    'dispelling bomb':   'Targeted dispel magic on direct hit.',
    'eternal potion':    'One potion/extract remains active permanently (dose per 24h).',
    'explosive bomb':    'Splash radius 10 ft instead of 5 ft. Targets in splash take 1d6 fire.',
    'fast bombs':        'Full attack action with bombs (one per attack).',
    'force bomb':        'Deals force damage; knock target prone (Ref neg).',
    'frost bomb':        'Cold damage. Slow on direct hit (Fort neg).',
    'grand mutagen':     'Prerequisite: greater mutagen. +6/+4/+2 to physical, –2/–2 to mental.',
    'greater mutagen':   'Prerequisite: 12th level. +4 to two physical stats, –2 to two mental.',
    'healing touch':     'Once per day, heal as cleric of alchemist level.',
    'infusion':          'Extracts can be used by other characters.',
    'internal bomb':     'Swallow a bomb as a standard action. Deal blast damage to self + 1 nearby creature on start of next turn.',
    'lingering spirit':  'Once per day, if reduced to 0 hp, remain active for 1 round.',
    'miasmic bomb':      'Nauseates on direct hit (Fort neg). Splash: sicken 1 round.',
    'mutagen':           'Create and drink mutagen as standard action. Already a class feature.',
    'nauseating flesh':  'Biters must save (Fort DC 10+½level+Con) or be nauseated 1 round.',
    'poison bomb':       'Cloud of contact poison (Fort neg). Lasts 1 round.',
    'precise bombs':     'Choose squares to exclude from splash damage.',
    'shock bomb':        'Electricity damage. Dazzles on direct hit.',
    'smoke bomb':        'Creates obscuring smoke cloud for 1 round/level.',
    'sticky bomb':       'Splash damage on direct hit persists (1d6/round, 1 round/5 CL).',
    'stink bomb':        'Creates nauseating cloud for 1 round/level.',
    'strafe bomb':       'Throw bombs in a line with one throw.',
    'sunlight bomb':     'Affects light sensitivity. Blinds light-sensitive on direct hit.',
    'tanglefoot bomb':   'Entangles target (Ref neg). Splash: 5-ft movement penalty.',
    'tumor familiar':    'Graft familiar into body. Familiar hides inside; still grants benefits.',
    'vestigial arm':     'Grow extra arm. Cannot hold shields but can hold items/wield weapons.',
    // Investigator talents
    'amazing inspiration':  'Roll two d6 for inspiration, take higher result.',
    'combat inspiration':   'Use inspiration for attack/saves without spending a use (once/round).',
    'deduction':            'Once per day, know exact HP of a creature you study.',
    'empathy':              'Use Sense Motive as move action, +1d6 insight vs creatures you study.',
    'expanded inspiration': 'Use inspiration on Diplomacy, Heal, Perception, Profession, Sense Motive for free.',
    'greater combat inspiration': 'Use inspiration on attacks without spending extra use.',
    'inspirational expertise': 'When using inspiration on a skill, treat skill as trained.',
    'investigator talent':  'Generic investigator class talent.',
    'knock-out blow':       'Once/day, if studied target fails Fort, knocked unconscious 1d6 rounds.',
    'quick study':          'Study target as move action instead of standard.',
    'tenacious inspiration': 'Roll inspiration die twice, take higher result.',
    'underworld inspiration': 'Free inspiration on Bluff, Disable Device, Disguise, Sleight of Hand, Stealth.',
  };

  const q = query.toLowerCase();
  const match = Object.entries(DISCOVERIES).find(([name]) =>
    name.includes(q) || q.includes(name)
  );
  if (match) {
    desc.innerHTML = `<span class="rp-name">${match[0]}</span>: ${match[1]}`;
  } else {
    desc.innerHTML = '';
  }
}

function updateRageBar() {
  const used  = parseInt(document.getElementById('rage_used')?.value) || 0;
  const total = parseInt(document.getElementById('rage_total')?.value) || 1;
  const bar   = document.getElementById('rage-bar');
  const left  = document.getElementById('rage-rounds-left');
  if (!bar) return;
  const remaining = Math.max(0, total - used);
  const pct = Math.round((remaining / total) * 100);
  bar.style.width = pct + '%';
  bar.style.background = pct > 50 ? 'var(--accent)' :
                         pct > 25 ? '#c8760a' : '#8b0000';
  if (left) left.textContent = remaining + ' left';
}

function onRagePowerType(i) {
  const input = document.getElementById('rage_power_' + i);
  const desc  = document.getElementById('rage_power_desc_' + i);
  if (!input || !desc) return;
  const query = input.value.trim().toLowerCase();
  if (!query || query.length < 2) { desc.innerHTML = ''; return; }

  // Look up rage powers from class_features if available
  const RAGE_POWERS = {
    'animal fury':      'Gain a bite attack (1d4+Str) as a bonus attack in full attack while raging.',
    'clear mind':       'Once per rage, reroll a Will saving throw. Take the better result.',
    'come and get me':  'Free action: provoke AoO from all adjacent enemies. Until next turn, attacks against you gain +4, your attacks vs those enemies deal +4 damage.',
    'knockback':        'Once per round on a successful hit, attempt a bull rush as a free action without provoking AoO.',
    'lesser elemental rage': 'Elemental Rage prereq. As a swift action once/rage, deal +1d6 elemental damage on next hit.',
    'night vision':     'Gain darkvision 60 ft while raging (30 ft if already have darkvision).',
    'no escape':        'Take an AoO when an adjacent enemy withdraws. Move with them (up to your speed).',
    'powerful blow':    'Once per rage, add +1d6 damage to a single melee attack. +1d6 per 4 levels above 4th.',
    'quick reflexes':   '+1 additional attack of opportunity per round while raging.',
    'raging climber':   '+4 climb speed while raging.',
    'raging leaper':    '+4 to Acrobatics for jumping while raging. Jumps are always running jumps.',
    'raging swimmer':   '+4 swim speed while raging.',
    'renewed vigor':    'Once per day while raging: heal 1d8+Con mod hp as a standard action.',
    'rolling dodge':    'Gain a +1 dodge bonus to AC per 6 barbarian levels while raging (min +1).',
    'roused anger':     'Enter rage even while fatigued. Still become exhausted after.',
    'scent':            'Gain the scent ability while raging.',
    'superstition':     '+2 to saves vs magic per 4 levels while raging. Must attack spellcasters if possible.',
    'surprising charge':'Once per rage, move up to your speed as an immediate action before your turn.',
    'swift foot':       '+5 ft enhancement to speed while raging.',
    'terrifying howl':  'Standard action: all shaken enemies within 30 ft must make Will save (DC 10+½level+Str) or become frightened for 1d4+1 rounds.',
    'thick skin':       '+1 natural armor bonus. +1 per 6 barbarian levels.',
    'unexpected strike':'Once per rage, make an AoO against a foe that moves into a threatened square.',
  };

  const match = Object.entries(RAGE_POWERS).find(([name]) => name.includes(query) || query.includes(name));
  if (match) {
    desc.innerHTML = `<span class="rp-name">${match[0]}</span>: ${match[1]}`;
  } else {
    desc.innerHTML = '';
  }
}


function addSpellRow(sl) {
  const container = document.getElementById('spell-rows-' + sl);
  if (!container) return;
  const rows = container.querySelectorAll('.spell-row');
  const i = rows.length;
  const div = document.createElement('div');
  div.className = 'spell-row';
  div.innerHTML = `
    <input type="checkbox" class="spell-prep-cb" id="spl_prep_${sl}_${i}"
           title="Prepared" onchange="toggleSpellPrepared(${sl},${i},this.checked)">
    <input type="checkbox" class="spell-cast-cb" id="spl_cast_${sl}_${i}"
           title="Cast today">
    <input type="text" id="spl_name_${sl}_${i}" class="spell-name-input"
           placeholder="Spell name…"
           oninput="onSpellNameInput('spl_name_${sl}_${i}')">
    <span class="spell-row-desc" id="spl_desc_${sl}_${i}"></span>`;
  container.appendChild(div);
  buildSpellAutocomplete('spl_name_' + sl + '_' + i, null);
}

function removeSpellRow(sl) {
  const container = document.getElementById('spell-rows-' + sl);
  if (!container) return;
  const rows = container.querySelectorAll('.spell-row');
  if (rows.length <= 1) return;
  rows[rows.length - 1].remove();
}

function buildPage4Spells(classKey, level) {
  const page = document.getElementById('page4-spells');
  if (!page) return;
  const nonCasters = ['fighter','barbarian','rogue','monk','gunslinger',
    'swashbuckler','slayer','cavalier','samurai','ninja','kineticist','brawler'];
  if (nonCasters.includes(classKey)) { page.style.display = 'none'; return; }
  page.style.display = '';
  window._currentClass = classKey;

  const content = document.getElementById('page4-spells-content');
  if (!content) return;

  const cls    = typeof CLASSES !== 'undefined' ? CLASSES[classKey] : null;
  const ab     = cls ? (cls.spellAbility || 'wis') : 'wis';
  const abMod  = typeof getEffectiveMod !== 'undefined' ? getEffectiveMod(ab.substring(0,3)) : 0;
  const table  = typeof getSpellTable !== 'undefined' ? getSpellTable(classKey) : null;
  const slots  = table ? (table[level] || []) : [];
  const maxSL  = slots.reduce((max, s, i) => s > 0 ? i + 1 : max, 0);
  const modStr = (abMod >= 0 ? '+' : '') + abMod;

  // Spontaneous casting block at top
  const spontHTML = typeof getSpontaneousCastingFull !== 'undefined'
    ? (getSpontaneousCastingFull(classKey) || '') : '';
  // For alchemist: rename "Spells" to "Extracts" in page title
  const pageTitle = document.getElementById('page4-title');
  if (pageTitle) {
    pageTitle.textContent = (classKey === 'alchemist' || classKey === 'investigator')
      ? 'Extracts' : 'Spells – Page 4';
  }

  // Alchemist / Investigator: extracts, no orisons
  const isAlchemist = classKey === 'alchemist' || classKey === 'investigator';
  let html = spontHTML;

  // Orison block (level 0) — not for alchemist
  if (!isAlchemist) html += buildSpellBlock(0, 0, 6);

  // Spell level blocks 1-9
  for (let sl = 1; sl <= 9; sl++) {
    const base  = slots[sl - 1] || 0;
    if (!base && sl > maxSL) break;
    const bonus = (base > 0 && abMod >= sl) ? 1 + Math.floor((abMod - sl) / 4) : 0;
    const total = base + bonus;
    const dc    = 10 + sl + abMod;
    if (total > 0) html += buildSpellBlock(sl, dc, total + 2);
  }

  content.innerHTML = html;
}

function buildSpellBlock(sl, dc, rowCount) {
  const isOrison = sl === 0;
  const label    = isOrison ? 'Orisons' : 'Level ' + sl;

  // Slot dots (not for orisons)
  let dots = '';
  if (!isOrison) {
    const slotCount = rowCount - 2; // base slots
    for (let d = 0; d < Math.min(slotCount, 12); d++) {
      dots += `<span class="spell-dot" id="sdot_${sl}_${d}" onclick="toggleSpellDot(${sl},${d})" title="Slot ${d+1}"></span>`;
    }
  }

  // Spell rows
  let rows = '';
  for (let i = 0; i < rowCount; i++) {
    rows += `<div class="srow" id="srow_${sl}_${i}">
      <input type="checkbox" class="srow-prep" id="sprep_${sl}_${i}"
             onchange="onSpellPrepChange(${sl},${i},this.checked)"
             title="Prepared for today">
      <input type="text" class="srow-name" id="sname_${sl}_${i}"
             placeholder="${isOrison ? 'Orison…' : 'Spell name…'}"
             oninput="onSpellNameType(${sl},${i})"
             autocomplete="off">
      <div class="srow-suggest" id="ssug_${sl}_${i}"></div>
      <div class="srow-detail" id="sdetail_${sl}_${i}"></div>
    </div>`;
  }

  return `<div class="spellblock">
    <div class="spellblock-header">
      <span class="sb-label">${label}</span>
      ${!isOrison ? `<span class="sb-dc">DC ${dc}</span>` : ''}
      <span class="sb-dots">${dots}</span>
      ${!isOrison ? `<span class="sb-dotlabel">klik = gebruikt</span>` : ''}
      <span class="sb-controls no-print">
        <button onclick="removeSpellRowFrom(${sl})" class="slot-btn slot-btn-minus">−</button>
        <button onclick="addSpellRowTo(${sl})" class="slot-btn slot-btn-plus">+</button>
      </span>
    </div>
    <div class="spellblock-cols">
      <span class="sbc-prep">✓</span>
      <span class="sbc-name">Spell</span>
      <span class="sbc-detail">Beschrijving</span>
    </div>
    <div class="spellblock-rows" id="sbrows_${sl}">${rows}</div>
  </div>`;
}

function toggleSpellDot(sl, i) {
  const dot = document.getElementById(`sdot_${sl}_${i}`);
  if (dot) dot.classList.toggle('used');
}

function onSpellPrepChange(sl, i, checked) {
  const nameEl = document.getElementById(`sname_${sl}_${i}`);
  if (nameEl) nameEl.classList.toggle('spell-prepared', checked);
}

function onSpellNameType(sl, i) {
  const inputEl  = document.getElementById(`sname_${sl}_${i}`);
  const sugEl    = document.getElementById(`ssug_${sl}_${i}`);
  const detailEl = document.getElementById(`sdetail_${sl}_${i}`);
  if (!inputEl || !sugEl) return;

  const query = inputEl.value.trim();

  // Clear detail if name empty
  if (!query) {
    sugEl.innerHTML = '';
    sugEl.style.display = 'none';
    detailEl.innerHTML = '';
    return;
  }

  if (typeof SPELLS_DB !== 'undefined' && query.length >= 2) {
    const classKey = (val('charClass') || '').toLowerCase();
    const allResults = SPELLS_DB.filter(s =>
      s.name.toLowerCase().startsWith(query.toLowerCase()) ||
      s.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 12);

    if (allResults.length) {
      // Determine which spells are on the character's class list
      // Warpriest uses cleric list
      const listKey = classKey === 'warpriest' ? 'cleric' :
                      classKey === 'arcanist'  ? 'wizard'  :
                      classKey === 'bloodrager'? 'sorcerer':
                      classKey === 'hunter'    ? 'druid'   :
                      classKey === 'skald'     ? 'bard'    :
                      classKey;

      sugEl.innerHTML = allResults.map(s => {
        const onList  = s.level && (s.level[classKey] !== undefined || s.level[listKey] !== undefined);
        const spellSL = s.level ? (s.level[classKey] ?? s.level[listKey] ?? null) : null;
        const wrongLvl = spellSL !== null && spellSL !== sl && sl > 0;
        const warn = !onList  ? '<span class="sug-warn" title="Not on your class spell list">⚠</span>' :
                     wrongLvl ? `<span class="sug-warn sug-lvl" title="This is a level ${spellSL} spell for your class">L${spellSL}</span>` : '';
        const cls = onList && !wrongLvl ? 'spell-sug-item' : 'spell-sug-item sug-off-list';
        return `<div class="${cls}" onmousedown="event.preventDefault();pickSpell(${sl},${i},'${s.name.replace(/'/g,"\'")}')">${warn}${s.name} <span class="sug-school">${s.school||''}</span></div>`;
      }).join('');
      sugEl.style.display = 'block';
    } else {
      sugEl.style.display = 'none';
    }

    // Exact match → show detail
    const exact = SPELLS_DB.find(s => s.name.toLowerCase() === query.toLowerCase());
    showSpellDetail(detailEl, exact);
  } else if (query.length < 2) {
    sugEl.style.display = 'none';
  }
}

function pickSpell(sl, i, name) {
  const inputEl  = document.getElementById(`sname_${sl}_${i}`);
  const sugEl    = document.getElementById(`ssug_${sl}_${i}`);
  const detailEl = document.getElementById(`sdetail_${sl}_${i}`);
  if (inputEl)  inputEl.value = name;
  if (sugEl)  { sugEl.innerHTML = ''; sugEl.style.display = 'none'; }
  const spell = typeof SPELLS_DB !== 'undefined'
    ? SPELLS_DB.find(s => s.name === name) : null;
  showSpellDetail(detailEl, spell);
}

function showSpellDetail(el, spell) {
  if (!el) return;
  if (!spell) { el.innerHTML = ''; return; }
  el.innerHTML =
    `<span class="sd-school">${spell.school || ''}</span>` +
    (spell.castingTime ? `<span class="sd-item">${spell.castingTime}</span>` : '') +
    (spell.range       ? `<span class="sd-item">${spell.range}</span>` : '') +
    (spell.duration    ? `<span class="sd-item">${spell.duration}</span>` : '') +
    (spell.description ? `<div class="sd-desc">${spell.description}</div>` : '');
}

function addSpellRowTo(sl) {
  const container = document.getElementById('sbrows_' + sl);
  if (!container) return;
  const i = container.querySelectorAll('.srow').length;
  const div = document.createElement('div');
  div.className = 'srow';
  div.id = `srow_${sl}_${i}`;
  div.innerHTML = `
    <input type="checkbox" class="srow-prep" id="sprep_${sl}_${i}"
           onchange="onSpellPrepChange(${sl},${i},this.checked)" title="Prepared">
    <input type="text" class="srow-name" id="sname_${sl}_${i}"
           placeholder="Spell name…" oninput="onSpellNameType(${sl},${i})" autocomplete="off">
    <div class="srow-suggest" id="ssug_${sl}_${i}"></div>
    <div class="srow-detail" id="sdetail_${sl}_${i}"></div>`;
  container.appendChild(div);
}

function removeSpellRowFrom(sl) {
  const container = document.getElementById('sbrows_' + sl);
  if (!container) return;
  const rows = container.querySelectorAll('.srow');
  if (rows.length <= 1) return;
  rows[rows.length - 1].remove();
}

function onSpellNameInput(inputId) {
  // Legacy compat — map old IDs to new function
  const parts = inputId.split('_');
  const sl = parseInt(parts[2]);
  const i  = parseInt(parts[3]);
  onSpellNameType(sl, i);
}


function buildSpellAutocomplete(inputId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.spellWrapped) return;
  input.dataset.spellWrapped = '1';
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const sug = document.createElement('div');
  sug.className = 'spell-suggestions';
  sug.style.display = 'none';
  wrap.appendChild(sug);
  input.addEventListener('input', () => {
    const q = input.value;
    if (typeof searchSpells==='undefined' || q.length<2) { sug.style.display='none'; return; }
    const results = searchSpells(q);
    if (!results.length) { sug.style.display='none'; return; }
    sug.innerHTML = results.map(s => {
      const lvlStr = Object.entries(s.level).map(([k,v])=>`${k} ${v}`).join(', ');
      return `<div class="feat-suggestion-item" onclick="selectSpellInto('${inputId}','${s.name.replace(/'/g,"\\'")}')" >
        <span class="feat-sug-name">${s.name}</span>
        <span class="feat-sug-type">${s.school.split(' ')[0]}</span>
        ${s.calcValue?`<span class="spell-sug-calc">${s.calcValue}</span>`:''}
        <span class="feat-sug-benefit">${lvlStr}</span>
      </div>`;
    }).join('');
    sug.style.display = 'block';
  });
  input.addEventListener('blur', () => setTimeout(()=>{ sug.style.display='none'; }, 200));
}

function selectSpellInto(inputId, name) {
  set(inputId, name);
  const spell = typeof getSpellByName!=='undefined' ? getSpellByName(name) : null;
  if (!spell) return;
  const input = document.getElementById(inputId);
  if (!input) return;
  const wandBlock = input.closest('.wand-block');
  if (wandBlock && spell) {
    const idx = (wandBlock.querySelector('[id^="wand_name_"]')||{}).id?.replace('wand_name_','');
    if (idx !== undefined) {
      const minLevel = Math.min(...Object.values(spell.level));
      set('wand_spelllvl_'+idx, minLevel);
      if (spell.calcValue) set('wand_effect_'+idx, spell.calcValue);
      if (spell.duration)  set('wand_duration_'+idx, spell.duration);
      const atkSel = document.getElementById('wand_attack_type_'+idx);
      if (atkSel) {
        if (spell.description.toLowerCase().includes('ranged touch')) atkSel.value='ranged_touch';
        else if (spell.description.toLowerCase().includes('melee touch')) atkSel.value='melee_touch';
        else atkSel.value='none';
      }
      calcWand(parseInt(idx));
    }
  }
}

function onTraitSearch(slot) {
  const inputId = 'trait'+slot+'_name';
  const sugId   = 'trait'+slot+'_suggestions';
  const query   = val(inputId);
  const sug     = document.getElementById(sugId);
  if (!sug || typeof searchTraits==='undefined') return;
  if (query.length < 2) { sug.style.display='none'; return; }
  const results = searchTraits(query, null);
  if (!results.length) { sug.style.display='none'; return; }
  // Store results for retrieval by index (avoids quoting issues with apostrophes)
  sug._traitResults = results;
  sug.innerHTML = results.map((t, idx) =>
    `<div class="feat-suggestion-item" onmousedown="event.preventDefault();selectTraitByIndex(${slot},${idx})">
      <span class="feat-sug-name">${t.name}</span>
      <span class="feat-sug-type">${t.type}</span>
      <span class="feat-sug-benefit">${t.benefit.substring(0,70)}${t.benefit.length>70?'…':''}</span>
    </div>`
  ).join('');
  sug.style.display = 'block';
}

function clearTraitDesc(slot) {
  const descEl = document.getElementById('trait' + slot + '_desc');
  if (descEl) descEl.innerHTML = '';
  const sug = document.getElementById('trait' + slot + '_suggestions');
  if (sug) sug.style.display = 'none';
}

function selectTraitByIndex(slot, idx) {
  const sugId = 'trait' + slot + '_suggestions';
  const sug   = document.getElementById(sugId);
  if (!sug || !sug._traitResults) return;
  const trait = sug._traitResults[idx];
  if (!trait) return;
  selectTrait(slot, trait.name);
}

function selectTrait(slot, name) {
  name = name.replace(/&#39;/g,"'");
  set('trait'+slot+'_name', name);
  const trait = typeof getTraitByName!=='undefined' ? getTraitByName(name) : null;
  const descEl = document.getElementById('trait'+slot+'_desc');
  if (descEl && trait) {
    const calc = trait.calcValue ? `<span class="trait-calc-badge">${trait.calcValue}</span>` : '';
    descEl.innerHTML = `<span class="trait-type-badge">${trait.type} · ${trait.source}</span>${calc}<span class="trait-benefit-text">${trait.benefit}</span>`;
  }
  if (trait) {
    if (trait.skillBonus && !trait.saveCondition) {
      Object.entries(trait.skillBonus).forEach(([skillId,amt]) => {
        const cur = parseInt(val('sk_misc_'+skillId))||0;
        set('sk_misc_'+skillId, cur+amt);
        calcSkill(skillId);
      });
    }
    if (trait.saveBonus && !trait.saveCondition) {
      ['fort','ref','will'].forEach(s => {
        if (trait.saveBonus[s]) { const cur=parseInt(val(s+'_misc'))||0; set(s+'_misc',cur+trait.saveBonus[s]); }
      });
      calcSaves();
    }
    if ((trait.saveBonus && trait.saveCondition) || trait.calcValue) {
      const note = trait.calcValue
        ? `[Trait: ${name}] ${trait.calcValue} — ${trait.benefit}`
        : `[Trait: ${name}] ${trait.benefit}`;
      const sa = val('special_abilities');
      if (!sa.includes('[Trait: '+name+']')) set('special_abilities', sa ? sa+'\n'+note : note);
    }
  }
  const sug = document.getElementById('trait'+slot+'_suggestions');
  if (sug) sug.style.display='none';
}

function restoreTraitDescriptions() {
  [1,2].forEach(slot => {
    const name = val('trait'+slot+'_name');
    if (name) selectTrait(slot, name);
  });
}

function applyMagicItemLookup() {
  if (!_selectedMagicItem) { alert('Select an item first.'); return; }
  const item = typeof getMagicItem!=='undefined' ? getMagicItem(_selectedMagicItem) : null;
  if (!item) return;
  const target = (document.getElementById('mi_lookup_target')||{}).value || 'ac';
  const acSlot = parseInt((document.getElementById('mi_lookup_acslot')||{}).value||'0');
  if (target === 'ac') {
    set('aci_name_'+acSlot,   _selectedMagicItem);
    set('aci_bonus_'+acSlot,  item.acBonus  || '');
    set('aci_type_'+acSlot,   item.acType   || item.slot || '');
    set('aci_maxdex_'+acSlot, item.maxDex !== undefined && item.maxDex < 99 ? item.maxDex : '');
    set('aci_check_'+acSlot,  item.checkPen !== undefined ? item.checkPen : '');
    set('aci_sf_'+acSlot,     item.spellFail || '');
    set('aci_wt_'+acSlot,     item.weight || '');
    set('aci_props_'+acSlot,  item.note || '');
    calcACItems();
    // Auto-apply item bonuses to ability scores / skills / saves
    registerItemBonus(_selectedMagicItem, acSlot);
  } else {
    // gear_auto: find first empty gear slot
    for (let i=0; i<GEAR_COUNT; i++) {
      if (!val('gear_name_'+i)) {
        set('gear_name_'+i, _selectedMagicItem);
        set('gear_wt_'+i, item.weight||0);
        calcGear();
        _selectedMagicItem = null;
        searchMagicItemUI();
        return;
      }
    }
    alert('No empty gear slots. Clear one first.');
  }
  _selectedMagicItem = null;
  searchMagicItemUI();
}

let _selectedMagicItem = null;
function searchMagicItemUI() {
  const query   = val('mi_lookup_search');
  const slotFil = (document.getElementById('mi_lookup_slot')||{}).value || '';
  const results = document.getElementById('mi_search_results');
  if (!results || typeof searchMagicItems==='undefined') return;
  const items = searchMagicItems(query, slotFil||null);
  results.innerHTML = items.map(([name,item]) => `
    <div class="mi-search-row ${_selectedMagicItem===name?'mi-selected':''}"
         onclick="selectMagicItem('${name.replace(/'/g,"\\'")}')">
      <span class="mi-item-name">${name}</span>
      <span class="mi-item-slot">${item.slot}</span>
      <span class="mi-item-cost">${item.cost?item.cost.toLocaleString()+' gp':''}</span>
      <span class="mi-item-note">${(item.note||'').substring(0,60)}${(item.note||'').length>60?'…':''}</span>
    </div>`).join('') || '<p class="helper-text" style="padding:4px">No items found.</p>';
}

function selectMagicItem(name) {
  _selectedMagicItem = name;
  searchMagicItemUI();
}

function updateMagicItemDots(i) {
  const max  = parseInt(val('mi_charges_max_'+i))||0;
  const used = parseInt(val('mi_charges_used_'+i))||0;
  const rem  = Math.max(0, max-used);
  const remEl = document.getElementById('mi_remaining_'+i);
  if (remEl) remEl.textContent = max>0 ? rem+'/'+max : '';
  const dotsEl = document.getElementById('mi_dots_'+i);
  if (!dotsEl||max===0) { if(dotsEl) dotsEl.innerHTML=''; return; }
  const show = Math.min(max,20);
  const usedD = Math.round((used/max)*show);
  let html='';
  for(let d=0;d<show;d++){
    const cls = d<(show-usedD)?'mi-dot-full':'mi-dot-used';
    html+=`<span class="mi-dot ${cls}" onclick="useMagicItemCharge(${i})"></span>`;
  }
  dotsEl.innerHTML = html;
}

function useMagicItemCharge(i) {
  const max=parseInt(val('mi_charges_max_'+i))||0;
  const used=parseInt(val('mi_charges_used_'+i))||0;
  if(used<max){set('mi_charges_used_'+i,used+1);updateMagicItemDots(i);}
}

function buildMagicItems() {
  const container = document.getElementById('magic-items-container');
  if (!container) return;
  container.innerHTML = '';
  for (let i=0; i<MAGIC_ITEM_COUNT; i++) {
    const row = document.createElement('div');
    row.className = 'magic-item-row';
    row.innerHTML = `
      <input type="text" id="mi_name_${i}" class="mi-name-input" placeholder="e.g. Wand of Cure Moderate Wounds">
      <div class="mi-charges-wrap">
        <input type="number" id="mi_charges_max_${i}" class="num small-num" placeholder="50" oninput="updateMagicItemDots(${i})" min="0" max="50">
        <span class="mi-label">max</span>
        <input type="number" id="mi_charges_used_${i}" class="num small-num" placeholder="0" oninput="updateMagicItemDots(${i})" min="0">
        <span class="mi-label">used</span>
        <span id="mi_dots_${i}" class="mi-dots"></span>
        <span id="mi_remaining_${i}" class="mi-remaining"></span>
      </div>`;
    container.appendChild(row);
  }
}

function toggleSetupBar() {
  const content = document.getElementById('setup-panels-content');
  const arrow   = document.getElementById('setup-toggle-arrow');
  if (!content) return;
  const hidden = content.style.display === 'none';
  content.style.display = hidden ? '' : 'none';
  if (arrow) arrow.textContent = hidden ? '▲ hide' : '▼ show';
  try { localStorage.setItem('pf1_setup_hidden', hidden?'0':'1'); } catch(e){}
}

function newCharacter() {
  if (!confirm('Start a new character? All unsaved changes will be lost.')) return;
  document.querySelectorAll('input:not([readonly]), textarea').forEach(el => el.value='');
  document.querySelectorAll('.cs-dot').forEach(d => d.classList.remove('checked'));
  document.querySelectorAll('.lang-checkbox').forEach(cb => cb.checked=false);
  calcAll(); calcACItems(); calcGear();
}

function saveCharacter() {
  const data = collectData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (val('charName')||'character').replace(/[^a-z0-9]/gi,'_')+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadCharacter() {
  document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      populateData(data);
    } catch(err) {
      console.error('Load error:', err);
      alert('Could not load file: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function calcSpellMeta() {
  const ab    = val('spell_ability') || 'WIS';
  const clvl  = parseInt(val('caster_level')) || 0;
  const abKey = ab.toLowerCase().substring(0,3);
  const abMod = getEffectiveMod(abKey);
  set('spell_dc_base',    10 + abMod);
  set('concentration_mod', clvl + abMod);
}

function initPages35() {
  // Pool dots, daily tracker, buff tracker init
  for (let i=0; i<RESOURCE_POOL_COUNT; i++) updatePoolDots(i);
}

function updatePoolDots(i) {
  const max    = parseInt(val('pool_max_'+i))||0;
  const dotsEl = document.getElementById('pool_dots_'+i);
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  for (let d=0; d<Math.min(max,20); d++) {
    const span = document.createElement('span');
    span.className = 'pool-dot';
    span.onclick   = () => { span.classList.toggle('filled'); };
    dotsEl.appendChild(span);
  }
}

function updateCarryWeight() {
  const str = parseInt(val('str_score'))||10;
  if (typeof getCarryCapacity === 'undefined') return;
  const cap = getCarryCapacity(str, val('size')||'Medium');
  set('load_light',  cap.light);
  set('load_medium', cap.medium);
  set('load_heavy',  cap.heavy);
}

/* ══════════════════════════════════════════════════
   XP PROGRESS BAR
   ══════════════════════════════════════════════════ */
function updateXPBar() {
  const current  = parseInt(val('xp_current')) || 0;
  const next     = parseInt(val('xp_next'))    || 0;
  const bar      = document.getElementById('xp-progress-bar');
  if (!bar || !next) return;
  const pct = Math.min(100, Math.round((current / next) * 100));
  bar.style.width = pct + '%';
  bar.title = `${current.toLocaleString()} / ${next.toLocaleString()} XP (${pct}%)`;
}
