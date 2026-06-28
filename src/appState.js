/**
 * ASSETS
 *
 * ・プリロード対象のアセット一覧
 *
 * 役割：
 * - モデルロード識別子
 * - SpawnManagerで使用されるIDと完全一致させる必要あり
 *
 * 構成：
 * - 地形 / Miku / 植物 / エフェクト / 特殊オブジェクト
 */
export const ASSETS = [

    // 水面
    'lake2',

    // Miku通常モーション
    'MikuWalk',
    'MikuRun',

    // 停止系モーション
    'MikuWalkToStopA',
    'MikuWalkToStopB',

    'MikuStop',
    'MikuStoptoCollapse',

    // 感情モーション
    'MikuHand',
    'MikuHart',
    'MikuTurn',
    'MikuTurnB',

    // 花
    'flower1',
    'flower2',
    'flower3',

    // 草
    'Grass1',
    'Grass2',
    'Grass3',

    // 葉・波紋
    'Leaf',
    'Ripple',

    // Prismオブジェクト
    'Prism1',
    'Prism2',
    'Prism3',

    // 音用オブジェクト
    'tone'
];


/**
 * SCALES
 *
 * ・各アセットの基本スケール定義
 *
 * 役割：
 * - SpawnManagerで自動適用される
 * - 見た目のバランスをここで統一管理
 *
 * 注意：
 * - 実モデルのサイズ差を補正している
 */
export const SCALES = {

    // 水面
    lake2: 80.0,

    // Miku（基本1.0）
    MikuWalk: 1.0,
    MikuRun: 1.0,

    MikuWalkToStopA: 1.0,
    MikuWalkToStopB: 1.0,

    MikuStop: 1.0,
    MikuStoptoCollapse: 1.0,

    MikuHand: 1.0,
    MikuHart: 1.0,
    MikuTurn: 1.0,
    MikuTurnB: 1.0,

    // 花（やや小さめ）
    flower1: 0.8,
    flower2: 0.8,
    flower3: 0.8,

    // 草（種類ごとに差あり）
    Grass1: 0.3,
    Grass2: 1.0,
    Grass3: 0.5,

    // エフェクト
    Leaf: 1.0,
    Ripple: 5.0,

    // Prism（かなり小さい）
    Prism1: 0.2,
    Prism2: 0.1,
    Prism3: 0.1,

    // 音ノート
    tone: 0.55,
};


/**
 * state
 *
 * ・アプリの簡易グローバル状態
 *
 * 役割：
 * - UI選択状態
 * - プレイヤーの属性など
 */
export const state = {

    // キャラ状態（未使用 or 拡張用）
    personality: null,

    // 現在選択中アイテム
    selectedItem: 'flower1'
};


/**
 * COLORS
 *
 * ・植物や葉の色定義
 *
 * 役割：
 * - Spawn時やマテリアル調整で使用
 *
 * 注意：
 * - キー名は小文字混在あり（grass1など）
 *   → 使用側で統一が必要
 */
export const COLORS = {

    // 花
    flower1: 0xFF1493,
    flower2: 0x00FFFF,
    flower3: 0x9400D3,

    // 草（小文字ID）
    grass1: 0x00A88F,
    grass2: 0x228B22,
    grass3: 0x66FF66,

    // 葉
    leaves: 0x00FF7F,
    generalLeaf: 0x00CED1
};