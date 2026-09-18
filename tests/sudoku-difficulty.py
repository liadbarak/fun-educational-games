"""Offline difficulty checks. This file is never loaded by the website."""
import re
from pathlib import Path
ALL=511
ROWS=[[r*9+c for c in range(9)] for r in range(9)]
COLS=[[r*9+c for r in range(9)] for c in range(9)]
BOXES=[[(br+r)*9+bc+c for r in range(3) for c in range(3)] for br in [0,3,6] for bc in [0,3,6]]
UNITS=ROWS+COLS+BOXES
PEERS=[set().union(*(set(u) for u in UNITS if i in u))-{i} for i in range(81)]
BIT=[1<<i for i in range(9)]
def grade(board):
 b=board[:];cand=[0 if n else ALL for n in b]
 for i,n in enumerate(b):
  if not n:
   used=0
   for j in PEERS[i]:
    if b[j]:used|=BIT[b[j]-1]
   cand[i]=ALL&~used
 level=0;counts={'naked':0,'hidden':0,'locked':0,'pair':0}
 def place(i,v):
  b[i]=v.bit_length();cand[i]=0
  for j in PEERS[i]:cand[j]&=~v
 while 0 in b:
  singles=[i for i in range(81) if not b[i] and cand[i].bit_count()==1]
  if singles:
   for i in singles:
    if cand[i]:place(i,cand[i]);counts['naked']+=1
   continue
  hidden=None
  for u in UNITS:
   for v in BIT:
    ids=[i for i in u if cand[i]&v]
    if len(ids)==1:hidden=(ids[0],v);break
   if hidden:break
  if hidden:
   level=max(level,1);place(*hidden);counts['hidden']+=1;continue
  changed=False
  # Locked candidates, both pointing and claiming.
  for u in UNITS:
   for v in BIT:
    ids=[i for i in u if cand[i]&v]
    if len(ids)<2:continue
    for other in UNITS:
     if other==u or not set(ids)<=set(other):continue
     for j in set(other)-set(u):
      if cand[j]&v:cand[j]&=~v;changed=True;counts['locked']+=1
  if changed:level=max(level,2);continue
  for u in UNITS:
   masks={cand[i] for i in u if cand[i].bit_count()==2}
   for mask in masks:
    ids=[i for i in u if cand[i]==mask]
    if len(ids)!=2:continue
    for j in set(u)-set(ids):
     if cand[j]&mask:cand[j]&=~mask;changed=True;counts['pair']+=1
  if changed:level=max(level,2);continue
  return 'expert',counts
 return ['easy','medium','hard'][level],counts

if __name__ == '__main__':
 text=(Path(__file__).resolve().parents[1]/'sudoku/puzzles.js').read_text()
 for level,block in re.findall(r'(easy|medium|hard|expert): Object.freeze\(\[(.*?)\]\)',text,re.S):
  puzzles=re.findall(r'"([0-9]{162})"',block)
  assert len(puzzles)==30
  for packed in puzzles:
   actual,_=grade(list(map(int,packed[:81])))
   assert actual==level,(level,actual,packed[:81])
  print(f'{level}: all {len(puzzles)} puzzles match the documented technique rubric')
