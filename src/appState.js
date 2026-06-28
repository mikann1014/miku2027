export const ASSETS = [
    'lake2',

    'MikuWalk',
    'MikuRun',

    'MikuWalkToStopA',
    'MikuWalkToStopB',

    'MikuStop',
    'MikuStoptoCollapse',

    'MikuHand',
    'MikuHart',
    'MikuTurn',
    'MikuTurnB',


    'flower1',
    'flower2',
    'flower3',

    'Grass1',
    'Grass2',
    'Grass3',

    'Leaf',
    'Ripple',

    'Prism1',
    'Prism2',
    'Prism3',

    'tone',

    // 後半の鳥シーケンス用
    'bird'
];

export const SCALES = {
    lake2: 80.0,

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

    flower1: 0.8,
    flower2: 0.8,
    flower3: 0.8,

    Grass1: 0.3,
    Grass2: 1.0,
    Grass3: 0.5,

    Leaf: 1.0,
    Ripple: 5.0,

    Prism1: 0.2,
    Prism2: 0.1,
    Prism3: 0.1,

    tone: 0.55,

    // 鳥はカメラに映りやすいよう少し大きめ
    bird: 0.2
};

export const state = {
    personality: null,
    selectedItem: 'flower1'
};

export const COLORS = {
    flower1: 0xFF1493,
    flower2: 0x00FFFF,
    flower3: 0x9400D3,

    grass1: 0x00A88F,
    grass2: 0x228B22,
    grass3: 0x66FF66,

    leaves: 0x00FF7F,
    generalLeaf: 0x00CED1
};