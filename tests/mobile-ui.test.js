import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const html=fs.readFileSync('join.html','utf8'),css=fs.readFileSync('mobile.css','utf8'),ui=fs.readFileSync('mobile-ui.js','utf8');
test('mobile redesign preserves every gameplay script and existing control identifier',()=>{
  const baseline=execFileSync('git',['show','4e14889:join.html'],{encoding:'utf8'});
  const inline=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1].replaceAll('\r\n','\n')).filter(s=>s.trim());
  assert.deepEqual(inline(html),inline(baseline));
  for(const match of baseline.matchAll(/\bid="([^"]+)"/g))assert(html.includes(match[0]),match[1]);
  assert(!/fetch\(|lobbyRequest|localStorage|Audio\(|setInterval|setTimeout/.test(ui));
  assert(!fs.readFileSync('tv.html','utf8').includes('mobile.css'));
});
test('one mobile theme covers all panels, native inputs, safe areas, reduced motion and branding',()=>{
  assert(html.includes('<title>Halloween 2026</title>'));
  assert(html.includes('href="/mobile.css"'));assert(!html.includes('/chapter5.css'));
  assert(!html.includes('<style>'));
  for(const color of ['#090A0C','#181B20','#22262C','#30343B','#F1F0ED','#A6ABB3','#858C96','#C99664','#D8A16B'])assert(css.includes(color));
  for(const token of ['prefers-reduced-motion','safe-area-inset-bottom','100dvh',':focus-visible','min-height:48px','select[data-selected=true]'])assert(css.includes(token));
  assert(!/chapter|progress|remaining/i.test(html.slice(html.indexOf('<header'),html.indexOf('<main'))));
  assert(ui.includes('Selected · not submitted'));
  assert(ui.includes("window.addEventListener('offline'"));
});
