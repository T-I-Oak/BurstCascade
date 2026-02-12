"""
Burst Cascade - 最強戦略決定戦 (Aggressive vs Balanced)
"""
import random, copy, time
from collections import Counter

class Board:
    def __init__(self, size=4):
        self.size = size
        self.hexes = {} # (q, r) -> [height, owner, has_flag, flag_owner]
        for q in range(-size + 1, size):
            r1, r2 = max(-size + 1, -q - size + 1), min(size - 1, -q + size - 1)
            for r in range(r1, r2 + 1):
                h, o, has_f, f_o = 0, 0, False, 0
                corners = [(3, 0), (0, 3), (-3, 3), (-3, 0), (0, -3), (3, -3)]
                if (q, r) in corners:
                    idx = corners.index((q, r))
                    is_p1 = (idx % 2 == 0)
                    h, o, has_f, f_o = (3, 1, True, 1) if is_p1 else (-3, 2, True, 2)
                self.hexes[(q, r)] = [h, o, has_f, f_o]
        self.hands = {
            1: [[0,0,3], [1,0,1], [1,-1,1], [0,-1,1], [-1,0,1], [-1,1,1], [0,1,1]],
            2: [[0,0,-3], [1,0,-1], [1,-1,-1], [0,-1,-1], [-1,0,-1], [-1,1,-1], [0,1,-1]]
        }
        self.chains = {1: {'self': 0, 'enemy': 0}, 2: {'self': 0, 'enemy': 0}}

    def copy(self):
        nb = Board.__new__(Board)
        nb.size = self.size
        nb.hexes = {k: v[:] for k, v in self.hexes.items()}
        nb.hands = {1: [v[:] for v in self.hands[1]], 2: [v[:] for v in self.hands[2]]}
        nb.chains = {1: self.chains[1].copy(), 2: self.chains[2].copy()}
        return nb

    def move(self, q, r, p):
        hand = self.hands[p]
        ov = []
        rew = False
        for dq, dr, dh in hand:
            pos = (q + dq, r + dr)
            if pos in self.hexes:
                h = self.hexes[pos]
                orig_o = h[1]
                h[0] += dh
                if abs(h[0]) > 9: h[0] = 0; ov.append(orig_o)
                h[1] = 1 if h[0] > 0 else (2 if h[0] < 0 else 0)
                if h[2] and (h[1] == 0 or h[1] != h[3]): h[2] = False
        
        cont = (len(ov) > 0)
        for o in ov:
            type = 'enemy' if (o != 0 and o != p) else 'self'
            self.chains[p][type] += 1
            if self.chains[p][type] >= (2 if type == 'enemy' else 4):
                self.chains[p][type] = 0; rew = True
                if type == 'self':
                    idx = random.randint(0, 6)
                    if abs(self.hands[p][idx][2]) < 5: self.hands[p][idx][2] += (1 if p == 1 else -1)
                else:
                    cands = [pos for pos, h in self.hexes.items() if h[1] == p and not h[2]]
                    if cands: pos = random.choice(cands); self.hexes[pos][2], self.hexes[pos][3] = True, p
        
        # Turn swap check
        if not cont or rew:
            self.chains[p]['self'] = 0
            return False
        return True

def evaluate(b, p, params):
    opp = 2 if p == 1 else 1
    s = 0
    for h in b.hexes.values():
        if h[2]: s += params['W_CORE'] if h[3] == p else -params['W_CORE']
        if h[1] == p: s += params['W_TERRITORY'] + abs(h[0]) * params['W_ENERGY']
        elif h[1] == opp: s -= (params['W_TERRITORY'] + abs(h[0]) * params['W_ENERGY'])
    s += b.chains[p]['self'] * params['W_CHAIN'] + b.chains[p]['enemy'] * params['W_CHAIN'] * 3
    return s

def minimax(b, d, a, be, isM, p, params):
    opp = 2 if p == 1 else 1
    curr = p if isM else opp
    f1 = sum(1 for h in b.hexes.values() if h[2] and h[3] == 1)
    f2 = sum(1 for h in b.hexes.values() if h[2] and h[3] == 2)
    if not f1: return -2000000 + d
    if not f2: return 2000000 - d
    if d <= 0: return evaluate(b, p, params)
    cands = [pos for pos, h in b.hexes.items() if h[1] == curr]
    if not cands: return -1000000 if isM else 1000000
    if isM:
        mx = -float('inf')
        for pos in cands:
            t = b.copy()
            c = t.move(pos[0], pos[1], curr)
            ev = minimax(t, d - (0.5 if c else 1.0), a, be, c, p, params)
            mx = max(mx, ev); a = max(a, ev)
            if be <= a: break
        return mx
    else:
        mn = float('inf')
        for pos in cands:
            t = b.copy()
            c = t.move(pos[0], pos[1], curr)
            ev = minimax(t, d - (0.5 if c else 1.0), a, be, not c, p, params)
            mn = min(mn, ev); be = min(be, ev)
            if be <= a: break
        return mn

def match(p1, p2):
    b = Board()
    curr = 1
    for t in range(200):
        f = [sum(1 for h in b.hexes.values() if h[2] and h[3] == i) for i in [1, 2]]
        if f[0] == 0: return 2
        if f[1] == 0: return 1
        params = p1 if curr == 1 else p2
        best_v, best_p = -float('inf'), None
        cands = [pos for pos, h in b.hexes.items() if h[1] == curr]
        if not cands: curr = 3 - curr; continue
        for pos in cands:
            t_b = b.copy()
            c = t_b.move(pos[0], pos[1], curr)
            v = minimax(t_b, 2.0, -float('inf'), float('inf'), c, curr, params)
            if v > best_v: best_v, best_p = v, pos
        if not b.move(best_p[0], best_p[1], curr): curr = 3 - curr
    return 0

s_agg = {'W_CORE': 50000, 'W_TERRITORY': 30, 'W_ENERGY': 8, 'W_CHAIN': 40}
s_bal = {'W_CORE': 80000, 'W_TERRITORY': 20, 'W_ENERGY': 2, 'W_CHAIN': 20}

print("Running 10 matches (Agg vs Bal)...")
res = Counter()
for i in range(10):
    w = match(s_agg, s_bal) if i < 5 else match(s_bal, s_agg)
    winner = "Agg" if (i < 5 and w == 1) or (i >= 5 and w == 2) else ("Bal" if w != 0 else "Draw")
    res[winner] += 1
    print(f"Game {i+1}: {winner}")
print(f"Final: {dict(res)}")
