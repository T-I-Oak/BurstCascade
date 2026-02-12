"""
Burst Cascade - 高度CPU戦略解析ツール (Ver 4.0: ターン別リセット対応版)
======================================================
"""

import math
import random
from collections import Counter
import time

class Board:
    def __init__(self, size=4):
        self.size = size
        self.hexes = {} # (q, r) -> [height, owner, has_flag, flag_owner]
        self.generate_main_map()
        self.hands = {
            1: [[0,0,3], [1,0,1], [1,-1,1], [0,-1,1], [-1,0,1], [-1,1,1], [0,1,1]],
            2: [[0,0,-3], [1,0,-1], [1,-1,-1], [0,-1,-1], [-1,0,-1], [-1,1,-1], [0,1,-1]]
        }
        self.chain_counts = {1: {'self': 0, 'enemy': 0}, 2: {'self': 0, 'enemy': 0}}

    def generate_main_map(self):
        for q in range(-self.size + 1, self.size):
            r1 = max(-self.size + 1, -q - self.size + 1)
            r2 = min(self.size - 1, -q + self.size - 1)
            for r in range(r1, r2 + 1):
                h, o, has_f, f_o = 0, 0, False, 0
                corners = [(3, 0), (0, 3), (-3, 3), (-3, 0), (0, -3), (3, -3)]
                if (q, r) in corners:
                    idx = corners.index((q, r))
                    is_p1 = (idx % 2 == 0)
                    h, o, has_f, f_o = (3, 1, True, 1) if is_p1 else (-3, 2, True, 2)
                self.hexes[(q, r)] = [h, o, has_f, f_o]

    def fast_copy(self):
        new_board = Board.__new__(Board)
        new_board.size = self.size
        new_board.hexes = {k: v[:] for k, v in self.hexes.items()}
        new_board.hands = {1: [v[:] for v in self.hands[1]], 2: [v[:] for v in self.hands[2]]}
        new_board.chain_counts = {1: self.chain_counts[1].copy(), 2: self.chain_counts[2].copy()}
        return new_board

    def apply_move(self, target_q, target_r, player):
        hand = self.hands[player]
        overflowed = []
        any_reward = False
        
        for dq, dr, dh in hand:
            pos = (target_q + dq, target_r + dr)
            if pos in self.hexes:
                hex_data = self.hexes[pos]
                orig_o = hex_data[1]
                hex_data[0] += dh 
                if abs(hex_data[0]) > 9:
                    hex_data[0] = 0
                    overflowed.append(orig_o)
                # update owner
                if hex_data[0] > 0: hex_data[1] = 1
                elif hex_data[0] < 0: hex_data[1] = 2
                else: hex_data[1] = 0
                
                if hex_data[2]: # has_flag
                    if hex_data[1] == 0 or hex_data[1] != hex_data[3]:
                        hex_data[2] = False
        
        overflow_occurred = len(overflowed) > 0
        self_reward_created = False
        for o_o in overflowed:
            is_enemy = (o_o != 0 and o_o != player)
            type_key = 'enemy' if is_enemy else 'self'
            self.chain_counts[player][type_key] += 1
            threshold = 2 if is_enemy else 4
            if self.chain_counts[player][type_key] >= threshold:
                self.chain_counts[player][type_key] = 0
                if type_key == 'self':
                    self_reward_created = True
                self.apply_reward(player, type_key)
        
        self.update_hand(player, 'diffuse' if overflow_occurred else 'focus')
        
        # 連鎖継続判定 (Ver 3.5.2: バーストが発生しており、かつ自陣報酬がない場合に継続)
        hand_continues = overflow_occurred and not self_reward_created
        
        # 重要: 手番が交代する場合のみ、自陣カウントをリセット
        if not hand_continues:
            self.chain_counts[player]['self'] = 0
            
        return hand_continues

    def update_hand(self, player, pattern):
        hand = self.hands[player]
        idx_a = random.randint(0, len(hand)-1)
        idx_b = random.randint(0, len(hand)-1)
        while idx_a == idx_b: idx_b = random.randint(0, len(hand)-1)
        
        change = 1 if player == 1 else -1
        if pattern == 'diffuse':
            if abs(hand[idx_a][2]) > 1: hand[idx_a][2] -= change
            if abs(hand[idx_b][2]) < 5: hand[idx_b][2] += change
        else:
            if abs(hand[idx_a][2]) < 5: hand[idx_a][2] += change
            if abs(hand[idx_b][2]) > 1: hand[idx_b][2] -= change

    def apply_reward(self, player, type_key):
        if type_key == 'self':
            idx = random.randint(0, len(self.hands[player])-1)
            if abs(self.hands[player][idx][2]) < 5:
                self.hands[player][idx][2] += (1 if player == 1 else -1)
        else:
            candidates = [pos for pos, h in self.hexes.items() if h[1] == player and not h[2]]
            if candidates:
                pos = random.choice(candidates)
                self.hexes[pos][2] = True
                self.hexes[pos][3] = player

def evaluate(board, player, params):
    opponent = 2 if player == 1 else 1
    score = 0
    for h in board.hexes.values():
        if h[2]: # has_flag
            score += params['W_CORE'] if h[3] == player else -params['W_CORE']
        if h[1] == player: # owner
            score += params['W_TERRITORY']
            score += abs(h[0]) * params['W_ENERGY']
        elif h[1] == opponent:
            score -= params['W_TERRITORY']
            score -= abs(h[0]) * params['W_ENERGY']
    # 連鎖進捗 (self はリセットされるため価値を下げる、enemy は蓄積されるため価値を上げる)
    score += board.chain_counts[player]['self'] * params['W_CHAIN']
    score += board.chain_counts[player]['enemy'] * params['W_CHAIN'] * 3
    # 敵コアへの圧力（簡易版）
    return score

def minimax(board, depth, alpha, beta, is_maximizing, player, params):
    opponent = 2 if player == 1 else 1
    current_actor = player if is_maximizing else opponent
    
    # 終局判定
    p1_flags = sum(1 for h in board.hexes.values() if h[2] and h[3] == 1)
    p2_flags = sum(1 for h in board.hexes.values() if h[2] and h[3] == 2)
    if not p1_flags: return -2000000 + (10 - depth) if player == 1 else 2000000 - (10 - depth)
    if not p2_flags: return 2000000 - (10 - depth) if player == 1 else -2000000 + (10 - depth)
    
    if depth <= 0: return evaluate(board, player, params)
    
    candidates = [pos for pos, h in board.hexes.items() if h[1] == current_actor]
    if not candidates: return -1000000 if is_maximizing else 1000000

    if is_maximizing:
        mx = -float('inf')
        for pos in candidates:
            tmp = board.fast_copy()
            cont = tmp.apply_move(pos[0], pos[1], current_actor)
            ev = minimax(tmp, depth - (0.5 if cont else 1.0), alpha, beta, cont, player, params)
            mx = max(mx, ev)
            alpha = max(alpha, ev)
            if beta <= alpha: break
        return mx
    else:
        mn = float('inf')
        for pos in candidates:
            tmp = board.fast_copy()
            cont = tmp.apply_move(pos[0], pos[1], current_actor)
            ev = minimax(tmp, depth - (0.5 if cont else 1.0), alpha, beta, not cont, player, params)
            mn = min(mn, ev)
            beta = min(beta, ev)
            if beta <= alpha: break
        return mn

def simulate_match(p1_params, p2_params, rounds=5):
    p1_wins = 0
    p2_wins = 0
    for _ in range(rounds):
        board = Board()
        curr = 1
        for turn in range(150):
            f1 = sum(1 for h in board.hexes.values() if h[2] and h[3] == 1)
            f2 = sum(1 for h in board.hexes.values() if h[2] and h[3] == 2)
            if not f1: p2_wins += 1; break
            if not f2: p1_wins += 1; break
            
            p = p1_params if curr == 1 else p2_params
            best_v, best_p = -float('inf'), None
            cands = [pos for pos, h in board.hexes.items() if h[1] == curr]
            if not cands: curr = 2 if curr == 1 else 1; continue
            
            for pos in cands:
                tmp = board.fast_copy()
                cont = tmp.apply_move(pos[0], pos[1], curr)
                v = minimax(tmp, 2.0, -float('inf'), float('inf'), cont, curr, p)
                if v > best_v: best_v, best_p = v, pos
            
            if not board.apply_move(best_p[0], best_p[1], curr):
                curr = 2 if curr == 1 else 1
    return p1_wins, p2_wins

if __name__ == "__main__":
    # 戦略設定（Ver 4.0）
    strategies = {
        "Defensive_V3": {'W_CORE': 100000, 'W_TERRITORY': 10, 'W_ENERGY': -5, 'W_CHAIN': 5}, # これまでの設定
        "Aggressive_V4": {'W_CORE': 50000, 'W_TERRITORY': 30, 'W_ENERGY': 8, 'W_CHAIN': 40}, # 攻撃的・連鎖重視
        "Balanced_V4": {'W_CORE': 80000, 'W_TERRITORY': 20, 'W_ENERGY': 2, 'W_CHAIN': 20}   # バランス型
    }
    
    print("Tournament Start (Rounds=5 per match)...")
    summary = {name: 0 for name in strategies}
    for s1 in strategies:
        for s2 in strategies:
            if s1 == s2: continue
            print(f"Match: {s1} vs {s2} ... ", end="", flush=True)
            w1, w2 = simulate_match(strategies[s1], strategies[s2])
            summary[s1] += w1
            summary[s2] += w2
            print(f"Results: {w1}-{w2}")

    print("\nFinal Rankings:")
    sorted_res = sorted(summary.items(), key=lambda x: x[1], reverse=True)
    for name, wins in sorted_res:
        print(f"{name}: {wins} total rounds won")
