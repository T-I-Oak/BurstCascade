import sys
import os

# 親ディレクトリをパスに追加して ai_analyzer をロード可能にする
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_analyzer import Board

def test_logic():
    print("Running Python Logic Tests...")
    
    # テストケース 1: 通常の移動（連鎖なし） -> 手番終了
    board = Board(4)
    p1_pos = [pos for pos, h in board.hexes.items() if h[1] == 1][0]
    board.hands[1] = [[0, 0, 1], [1, 0, 0]] 
    hand_continues = board.apply_move(p1_pos[0], p1_pos[1], 1)
    assert hand_continues == False, "連鎖なしで手番が継続してはいけない"
    print("Test 1: Passed")

    # テストケース 2: バースト発生（報酬なし） -> 手番継続
    board = Board(4)
    p1_pos = [pos for pos, h in board.hexes.items() if h[1] == 1][0]
    board.hexes[p1_pos][0] = 9 # 次で爆発
    board.hands[1] = [[0, 0, 1], [1, 0, 0]]
    hand_continues = board.apply_move(p1_pos[0], p1_pos[1], 1)
    assert hand_continues == True, "バースト発生時は手番が継続すべき"
    print("Test 2: Passed")

    # テストケース 3: 報酬獲得＋バースト発生 (Ver 3.5 修正箇所)
    board = Board(4)
    board.chain_counts[1]['self'] = 3 # 次で報酬
    p1_pos = [pos for pos, h in board.hexes.items() if h[1] == 1][0]
    board.hexes[p1_pos][0] = 9 # 次で爆発
    board.hands[1] = [[0, 0, 1], [1, 0, 0]]
    hand_continues = board.apply_move(p1_pos[0], p1_pos[1], 1)
    assert hand_continues == False, "自陣報酬が発生した場合は、バースト中でも手番が終了すべき (Ver 3.5.2)"
    print("Test 3: Passed")

    # テストケース 4: 敵陣報酬＋バースト発生
    board = Board(4)
    # 敵連鎖が1たまっており、次で2連鎖（敵報酬＝旗）になる状態
    board.chain_counts[1]['enemy'] = 1
    # 敵(P2)のマスのオーナーを奪って爆発させるのではなく、
    # 敵(P2)がオーナーのマスをそのまま爆発させるシミュレーション
    p2_pos = [pos for pos, h in board.hexes.items() if h[1] == 2][0]
    board.hexes[p2_pos][0] = -9 # P2の高度 -9
    # P1の手札タイルを調整して P2の高度を -10 にして爆散させる
    board.hands[1] = [[0, 0, -1], [1, 0, 0]] 
    hand_continues = board.apply_move(p2_pos[0], p2_pos[1], 1)
    
    assert hand_continues == True, "敵陣の旗を獲得してもバーストしていれば手番が継続すべき"
    print("Test 4: Passed")

    print("\nAll Python Tests Passed Successfully!")

if __name__ == "__main__":
    test_logic()
