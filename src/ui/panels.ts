import { getPrefs, setPrefs } from '../core/prefs';
import { money, npcName, productName, staffName, t, type Key } from '../i18n';
import { favBread, GIFT_KINDS, GIFT_LEVELS, LEVELS, NPC_ROW0, NPCS, OWNER_ROW, PRODUCT_BY_ID, SKILLS, STAFF_ROW0, TRAIT_BY_ID, unlockedSkills, type Skill } from '../game/defs';
import { rosterSize } from '../game/growth';
import { spriteIcon } from './achievements';

import type { Game } from '../game/game';
import { fitFixtures, inCafe, storeLayout } from '../game/chain';
import { CAFE_LEVEL } from '../game/layout';
import { affinityExpToNext, npcExpToNext, skillExpToNext, skillSpeed, type Leveled } from '../game/rules';
import { raiseOf, saveGame, wageOf, type DayStats, type Role, type StaffState } from '../game/state';
import { charIcon, productIcon, type UI } from './app';
import { h } from './dom';

function bar(ratio: number, cls = ''): HTMLElement {
  return h('div', { class: `meter ${cls}` }, [h('div', { class: 'fill', style: { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` } })]);
}

function skillRows(skills: Record<Skill, Leveled>, level: number): HTMLElement {
  const unlocked = new Set<Skill>(unlockedSkills(level));
  return h('div', { class: 'skills' }, SKILLS.filter((s) => unlocked.has(s)).map((s) => {
    const sk = skills[s];
    return h('div', { class: 'skill' }, [
      h('span', { class: 'sname', title: t(`skill.desc.${s}`) }, [t(`skill.${s}`)]),
      h('span', { class: 'slv' }, [`${t('common.level', { n: sk.level })} ×${skillSpeed(sk.level).toFixed(2)}`]),
      bar(sk.exp / skillExpToNext(sk.level)),
    ]);
  }));
}

const ROLES: Role[] = ['auto', 'cashier', 'stocker', 'cleaner', 'service'];

/** The general roles, then one per counter this store has. */
function rolesFor(g: Game): Role[] {
  const def = inCafe(g.state) ? CAFE_LEVEL : LEVELS[g.state.level];
  return [...ROLES, ...def.stations, ...(def.bagging ? (['bagging'] as const) : [])];
}

function roleLabel(r: Role): string {
  return ROLES.includes(r) ? t(`role.${r as 'auto'}`) : t(`station.${r as 'bagging'}`);
}

export function staffPanel(g: Game, ui: UI): HTMLElement {
  const st = g.state;
  const card = (row: number, name: string, extra: HTMLElement[], skills: Record<Skill, Leveled>, trait: string | null = null) =>
    h('div', { class: 'card' }, [
      h('div', { class: 'card-head' }, [charIcon(row), h('div', { class: 'card-title' }, [h('strong', {}, [name]), traitTag(trait), ...extra])]),
      skillRows(skills, st.level),
    ]);
  const night = g.phase === 'night';
  const out = h('div', { class: 'stack' }, [
    h('details', { class: 'recs' }, [
      h('summary', {}, [t('staff.skillHelp')]),
      h('dl', { class: 'skill-help' }, unlockedSkills(st.level).flatMap((s) => [h('dt', {}, [t(`skill.${s}`)]), h('dd', {}, [t(`skill.desc.${s}`)])])),
    ]),
    card(OWNER_ROW, t('staff.owner'), [], st.owner),
    h('h3', {}, [t('staff.hired')]),
    h('p', { class: 'muted' }, [t('staff.payNote')]),
  ]);
  if (!st.staff.length) out.append(h('p', { class: 'muted' }, [t('staff.none')]));
  const grid = h('div', { class: 'cards' });
  for (const s of st.staff) {
    const role = h('select', {
      class: 'select',
      onchange: (e: Event) => {
        s.role = (e.target as HTMLSelectElement).value as Role;
        const w = g.sim.workers.find((x) => x.staffId === s.id);
        if (w) w.role = s.role;
        saveGame(st);
      },
    }, [...new Set([...rolesFor(g), s.role])].map((r) => h('option', { value: r, selected: s.role === r }, [roleLabel(r)])));
    grid.append(card(STAFF_ROW0 + s.look, staffName(s.name), [
      h('span', { class: 'muted' }, [
        t('common.perDay', { v: money(wageOf(s)) }),
        raiseOf(s) > 0 ? h('span', { class: 'raise', title: t('staff.raiseHint') }, [t('staff.raise', { v: money(raiseOf(s)) })]) : null,
      ]),
      h('label', { class: 'row' }, [h('span', {}, [t('staff.role')]), role]),
      h('button', {
        class: 'btn small warn', onclick: () => ui.confirm(t('staff.fireConfirm', { name: staffName(s.name) }), () => {
          g.fire(s.id);
          ui.openPanel('staff.title', () => staffPanel(g, ui));
        }),
      }, [t('staff.fire')]),
    ], s.skills, s.trait));
  }
  out.append(grid);
  out.append(h('h3', {}, [t('staff.candidates')]));
  if (!night) out.append(h('p', { class: 'muted' }, [t('common.nightOnly')]));
  else if (!st.candidates.length) out.append(h('p', { class: 'muted' }, [t('staff.noCandidates')]));
  else {
    const cg = h('div', { class: 'cards' });
    for (const c of st.candidates) {
      cg.append(card(STAFF_ROW0 + c.look, staffName(c.name), [
        h('span', { class: 'muted' }, [t('common.perDay', { v: money(c.wage) })]),
        h('button', { class: 'btn small primary', onclick: () => { g.hire(c as StaffState); ui.rerenderPanel?.(); } }, [t('staff.hire')]),
      ], c.skills, c.trait));
    }
    out.append(cg);
  }
  if (st.former.length) {
    out.append(h('h3', {}, [t('staff.former')]));
    const fg = h('div', { class: 'cards' });
    for (const f of st.former) {
      fg.append(card(STAFF_ROW0 + f.look, staffName(f.name), [
        h('span', { class: 'muted' }, [t('common.perDay', { v: money(wageOf(f)) })]),
        h('button', { class: 'btn small', disabled: !night, onclick: () => { g.rehire(f.id); ui.rerenderPanel?.(); } }, [t('staff.rehire')]),
      ], f.skills, f.trait));
    }
    out.append(fg);
  }
  return out;
}

function traitTag(id: string | null): HTMLElement | null {
  const tr = id ? TRAIT_BY_ID.get(id) : undefined;
  if (!tr) return null;
  return h('span', { class: 'trait' }, [`${t(`trait.${tr.id}` as Key)} · ${t('trait.bonus', { skill: t(`skill.${tr.skill}`), p: Math.round((tr.mult - 1) * 100) })}`]);
}

export function regularsPanel(g: Game): HTMLElement {
  const roster = NPCS.slice(0, rosterSize(g.state));
  let sort: 'affinity' | 'level' = getPrefs().npcSort === 'level' ? 'level' : 'affinity';
  const list = h('div', { class: 'cards' });
  const render = () => {
    list.replaceChildren();
    const sorted = roster.slice().sort((a, b) => {
      const sa = g.state.npcs[a.id];
      const sb = g.state.npcs[b.id];
      return sort === 'affinity' ? sb.fond.level - sa.fond.level || sb.fond.exp - sa.fond.exp || sb.level - sa.level : sb.level - sa.level || sb.exp - sa.exp;
    });
    for (const n of sorted) {
      const s = g.state.npcs[n.id];
      list.append(h('div', { class: `card npc${s.visits ? '' : ' dim'}` }, [
        h('div', { class: 'card-head' }, [
          charIcon(NPC_ROW0 + n.index),
          h('div', { class: 'card-title' }, [
            h('strong', {}, [npcName(n.id)]),
            h('span', { class: 'muted' }, [s.visits ? t('npc.visits', { n: s.visits }) : t('npc.notMet')]),
          ]),
        ]),
        h('div', { class: 'kv' }, [h('span', {}, [`${t('npc.affinity')} ${t('common.level', { n: s.fond.level })}`]), bar(s.fond.exp / affinityExpToNext(s.fond.level), 'heart')]),
        h('div', { class: 'kv' }, [h('span', {}, [`${t('npc.shopper')} ${t('common.level', { n: s.level })}`]), bar(s.exp / npcExpToNext(s.level))]),
        h('div', { class: 'kv' }, [h('span', {}, [t('npc.likes')]), h('span', {}, [n.likes.map((c) => t(`cat.${c}` as Key)).join(' · ')])]),
        h('div', { class: 'kv' }, [h('span', {}, [t('npc.favorites')]), h('div', { class: 'row' }, n.favs.map((f) => productIcon(PRODUCT_BY_ID.get(f)!.index)))]),
        LEVELS[g.state.level].stations.includes('bakery')
          ? h('div', { class: 'kv' }, [h('span', {}, [t('npc.favBread')]), h('span', { class: 'row' }, [spriteIcon(`bread_${favBread(n.index)}_golden`), t(`bakery.${favBread(n.index)}`)])])
          : null,
        h('div', { class: 'kv' }, [h('span', {}, [t('npc.gifts')]), h('div', { class: 'row gifts' }, GIFT_KINDS.map((k, i) =>
          i < (g.state.gifts[n.id] ?? 0)
            ? spriteIcon(`gift_${k}`)
            : h('span', { class: 'gift-lock', title: t('npc.giftAt', { n: GIFT_LEVELS[i] }) }, ['?']),
        ))]),
      ]));
    }
  };
  render();
  const sel = h('select', { class: 'select', onchange: (e: Event) => { sort = (e.target as HTMLSelectElement).value as typeof sort; setPrefs({ npcSort: sort }); render(); } }, [
    h('option', { value: 'affinity', selected: sort === 'affinity' }, [t('npc.sortAffinity')]),
    h('option', { value: 'level', selected: sort === 'level' }, [t('npc.shopper')]),
  ]);
  const total = roster.reduce((a, n) => a + (g.state.gifts[n.id] ?? 0), 0);
  return h('div', { class: 'stack' }, [
    h('div', { class: 'row wrap' }, [
      h('label', { class: 'row' }, [h('span', {}, [t('npc.sort')]), sel]),
      h('span', { class: 'muted' }, [t('npc.album', { n: total, total: roster.length * GIFT_KINDS.length })]),
      g.state.friends ? h('span', { class: 'muted' }, [t('npc.friends', { n: g.state.friends })]) : null,
    ]),
    list,
  ]);
}

export function expandPanel(g: Game, ui: UI): HTMLElement {
  const st = g.state;
  const cur = LEVELS[st.level];
  if (inCafe(st)) return h('p', { class: 'muted' }, [t('cafe.noExpand')]);
  const next = LEVELS[st.level + 1];
  const out = h('div', { class: 'stack' }, [
    h('div', { class: 'kv' }, [h('span', {}, [t('expand.current')]), h('span', {}, [t('expand.size', { w: cur.w, h: cur.h })])]),
  ]);
  if (!next) {
    out.append(h('p', {}, [t('expand.max')]));
    return out;
  }
  const unlocks: string[] = [];
  for (const s of next.stations) if (!cur.stations.includes(s)) unlocks.push(t(`station.${s}`));
  if (next.bagging && !cur.bagging) unlocks.push(t('station.bagging'));
  if (next.registers > cur.registers) unlocks.push(t('expand.registers', { n: next.registers }));
  if (next.cards > cur.cards) unlocks.push(t('expand.cards', { n: next.cards }));
  unlocks.push(t('expand.more', { n: next.roster - cur.roster }));
  out.append(
    h('div', { class: 'kv' }, [h('span', {}, [t('expand.next')]), h('span', {}, [t('expand.size', { w: next.w, h: next.h })])]),
    h('div', { class: 'kv' }, [h('span', {}, [t('expand.unlocks')]), h('span', {}, [unlocks.join(' · ')])]),
    h('div', { class: 'kv' }, [h('span', {}, [t('expand.rent', { v: '' }).trim()]), h('span', {}, [`${money(cur.rent)} → ${money(next.rent)}`])]),
  );
  const can = g.phase === 'night' && st.money >= next.cost;
  out.append(h('button', {
    class: 'btn primary', disabled: !can,
    onclick: () => {
      st.money -= next.cost;
      // pin down where everything stands now, so the bigger floor is built around it
      storeLayout(st);
      st.level += 1;
      const fit = fitFixtures(st);
      g.checkChain();
      g.checkAchievements();
      saveGame(st);
      g.rebuild();
      g.fit();
      ui.closeModal();
      ui.refresh();
      g.toastFit(fit);
    },
  }, [t('expand.buy', { v: money(next.cost) })]));
  if (g.phase !== 'night') out.append(h('p', { class: 'muted' }, [t('common.nightOnly')]));
  return out;
}

export function reportPanel(s: DayStats): HTMLElement {
  const flow = s.revenue - s.restock - s.wages - s.rent;
  const rows: [Key, string, string?][] = [
    ['report.revenue', money(s.revenue)],
    ['report.goods', money(s.goodsCost)],
    ['report.restock', money(-s.restock)],
    ['report.wages', money(-s.wages)],
    ['report.rent', s.rentWaived ? t('report.rentWaived') : money(-s.rent)],
    ['report.cashflow', money(flow), flow >= 0 ? 'pos' : 'neg'],
    ...(s.chain ? [['report.chain', money(s.chain), 'pos'] as [Key, string, string]] : []),
    ...(s.spoiled ? [['report.spoiled', String(s.spoiled)] as [Key, string]] : []),
    ['report.customers', String(s.customers)],
    ['report.manual', String(s.manual)],
    ['report.affinity', `${t('common.level', { n: s.avgAffinity.toFixed(1) })}`],
    ['report.levelUps', String(s.levelUps)],
  ];
  const list = (title: Key, items: [string, number][] | undefined) => items && items.length
    ? h('div', { class: 'stack' }, [
        h('h3', {}, [t(title)]),
        ...items.map(([id, n]) => h('div', { class: 'kv rank' }, [
          h('span', { class: 'row' }, [productIcon(PRODUCT_BY_ID.get(id)?.index ?? 0), productName(id)]),
          h('strong', {}, [String(n)]),
        ])),
      ])
    : null;
  return h('div', { class: 'report' }, [
    ...rows.map(([k, v, cls]) => h('div', { class: `kv ${cls ?? ''}` }, [h('span', {}, [t(k)]), h('strong', {}, [v])])),
    list('report.topSold', s.topSold),
    list('report.stockouts', s.stockouts),
  ]);
}
