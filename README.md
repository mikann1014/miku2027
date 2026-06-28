# 世界最後の音楽隊 - Three.js / TextAlive Interactive Music World

初音ミク「マジカルミライ 2026」プログラミング・コンテスト応募作品 **「世界最後の音楽隊」** の楽曲進行に合わせて、Three.js の3D世界・歌詞・インタラクション・配置オブジェクト・演出が変化する WebGL 作品です。

このリポジトリは、TextAlive App API による楽曲同期、Three.js によるプロシージャル地形、初音ミクモデルのモーション制御、歌詞表示、クリック配置、山・湖・小島・花・音符・エンディング演出を組み合わせたインタラクティブな音楽体験を実装しています。

---

## 目次

- [概要](#概要)
- [現在の主な構成](#現在の主な構成)
- [ディレクトリ構成](#ディレクトリ構成)
- [起動方法](#起動方法)
- [主要ファイルと責務](#主要ファイルと責務)
- [現在の設計方針](#現在の設計方針)
- [配置オブジェクトとマテリアル方針](#配置オブジェクトとマテリアル方針)
- [山の花演出について](#山の花演出について)
- [リファクタリング方針](#リファクタリング方針)
- [今後の作業メモ](#今後の作業メモ)
- [注意点](#注意点)

---

## 概要

この作品では、楽曲の進行に応じて以下のような変化が起こります。

- 歌詞に応じた空色・環境色の変化
- 初音ミクの歩き・走り・停止・手を伸ばす・崩れ落ちる・再登場などのモーション遷移
- 青い音符の出現、追従、軌道運動、上昇
- 歌詞の浮遊表示、引き寄せ、消散
- 湖・道・小島・山への花・草・葉の配置
- 山に降り注ぐメロディ花の演出
- エンディングの空・流星・タイトル表示

---

## 現在の主な構成

```txt
src
├── appState.js
├── main.js
├── index.html
├── style.css
├── assets/
├── character/
├── core/
├── debug/
├── effects/
├── entities/
├── experience/
├── lyrics/
├── managers/
├── materials/
├── motion/
├── placement/
├── shaders/
├── spawn/
├── terrain/
├── ui/
└── _legacy/
```

---

## ディレクトリ構成

### `src/core`

アプリ全体の3D世界・環境・歌詞・演出更新を扱う中核です。

主なファイル:

```txt
WorldRenderer.js
EnvironmentManager.js
EffectManager.js
InteractionEventManager.js
LyricsManager.js
```

### `src/managers`

主要な管理クラス群です。

```txt
SpawnManager.js
PlacementManager.js
CharacterManager.js
CameraController.js
BlueNoteManager.js
MusicManager.js
ProceduralTerrainManager.js
ColorManager.js
```

### `src/effects`

視覚演出を担当します。

例:

```txt
ProceduralMountainFlowerField.js
NoteTrailEffect.js
WorldResonanceEffect.js
EndingWorldResponseEffect.js
LyricRainEffect.js
MikuDissolveToBirdEffect.js
```

### `src/materials`

配置オブジェクト、とくに花・草・葉のマテリアル方針を分離するためのディレクトリです。

```txt
PlacedPlantMaterialPolicy.js
```

### `src/placement`

配置処理・配置判定・地形アンカー・クラスター配置を担当します。

```txt
SurfacePicker.js
PlacementRules.js
PlacementAligner.js
PlacedObjectRegistry.js
ClusterPlacement.js
ClusterQueueProcessor.js
BloomController.js
SurfaceAnchorController.js
```

### `src/terrain`

プロシージャル地形と山・水面・道・小島・石などの生成を担当します。

```txt
TerrainMaterialFactory.js
TerrainFadeController.js
BackgroundMountainController.js
MountainFlowerPointService.js
generators/
utils/
```

### `src/_legacy`

現行構成では使わない、または旧設計のファイルを一時退避している場所です。

削除ではなく退避扱いにしています。必要ならあとで復元・参照できます。

---

## 起動方法

このプロジェクトは `index.html` を直接開くより、ローカルサーバーで起動してください。

例:

```bash
cd src
python -m http.server 5173
```

ブラウザで以下を開きます。

```txt
http://localhost:5173
```

または任意の静的サーバーを使用してください。

---

## 主要ファイルと責務

## `main.js`

アプリケーション起動、TextAlive連携、入力イベント、楽曲進行に応じた更新の入口です。

主な責務:

- `WorldRenderer` の生成
- `MusicManager` の生成
- `UIManager` の生成
- `MotionDirector` / `ExperiencePhaseDirector` の生成
- TextAlive の `onTimeUpdate` から楽曲同期処理を実行
- 毎フレーム `worldRenderer.update()` を呼び出す

---

## `WorldRenderer.js`

Three.js のシーン全体を管理します。

主な責務:

- `scene`, `camera`, `renderer` の生成
- マネージャ群の初期化
- GLBモデル読み込み
- プロシージャル地形生成
- 毎フレーム更新
- 山花演出、エンディング演出、流星、フェードアウトなどの橋渡し

今後は肥大化を避けるため、以下の処理はできるだけ専用クラスへ分離します。

- 山花ポイント生成
- 配置植物のマテリアル安定化
- 地形アンカー更新
- エンディングタイムライン

---

## `SpawnManager.js`

登録済みGLBモデルを複製してシーンへ配置します。

主な責務:

- モデル登録
- モデル複製
- material clone による個体ごとのマテリアル分離
- `CyberWireMaterialApplier` の適用
- 水面リップル管理

現在は花・草・葉のマテリアル補正を `PlacedPlantMaterialPolicy` に委譲する方針です。

---

## `PlacementManager.js`

クリック配置を管理します。

主な責務:

- クリック位置から地形判定
- 水面・地面・山・小島への配置分岐
- クラスター配置
- 配置オブジェクト登録
- `SurfaceAnchorController` による地形ローカル固定

---

## `ProceduralTerrainManager.js`

`lake2.glb` の代わりに、プロシージャル地形を生成します。

生成対象:

- 湖
- 中央の道
- 小島
- 飛び石
- 左右の山
- 遠景山

---

## `ProceduralMountainFlowerField.js`

「あなたのカタチに降り注ぐメロディ」付近で表示される、山に咲く丸い花の演出です。

現在の方針:

- `Points` ベースで描画
- `InstancedMesh` の毎フレーム billboard 更新は使わない
- 毎フレーム Raycast しない
- 山側の `Group` を anchor にして、山と一緒に動くようにする
- 数を増やしすぎず、`pointSize` を大きくして密度感を補う

---

## `MountainFlowerPointService.js`

山花のローカル座標を生成する専用クラスです。

主な責務:

- 左右の山ごとに点群を作る
- Raycast を使わない軽量な簡易式で山上に見える位置を生成
- `leftMountainGroup` / `rightMountainGroup` に対応した batch を返す

---

## `PlacedPlantMaterialPolicy.js`

配置された花・草・葉の見た目を安定化します。

方針:

- 面は描画しない
- wire のみ発色
- wire は地形に隠れにくくする
- エフェクト後にマテリアルが壊れても復元できる

---

## `SurfaceAnchorController.js`

配置オブジェクトを、地形メッシュのローカル座標に固定するためのクラスです。

主な責務:

- 配置時に `surfaceAnchorObject` と `surfaceAnchorLocalPosition` を保存
- 毎フレーム anchor の現在位置から world 座標を再計算
- 山・小島・水面が動いても、植えた位置に追従させる

---

## 現在の設計方針

## 1. 常設オブジェクトと一時演出を分ける

常設配置された花・草・葉と、一時的な bloom / shard / word effect は混ぜない方針です。

```txt
常設配置:
  PlacementManager
  PlacedObjectRegistry
  SurfaceAnchorController
  PlacedPlantMaterialPolicy

一時演出:
  EphemeralBloomEffect
  WordImpactEffectManager
  LyricRainEffect
  EndingWorldResponseEffect
```

---

## 2. 花・草・葉は wire 表示を基本にする

サイバー感を維持するため、配置植物は以下の方針です。

```txt
face material:
  opacity = 0
  colorWrite = false
  depthWrite = false

wire material:
  opacity = 1
  additive blending
  depthWrite = false
  depthTest = false
```

---

## 3. 山は moving terrain anchor として扱う

左右の山はミクの移動に合わせて動いています。

```js
leftMountainGroup.position.z = mikuZ;
rightMountainGroup.position.z = mikuZ;
```

そのため、山に配置したもの・山花演出は、山Groupまたは山Meshローカルに固定します。

```txt
ワールド固定ではなく、山ローカル固定
```

---

## 配置オブジェクトとマテリアル方針

## 通常配置植物

対象:

```txt
flower1
flower2
flower3
Grass1
Grass2
Grass3
Leaf
```

表示方針:

```txt
面は表示しない
wireだけ表示する
地形に埋もれて見えなくならないようにする
```

関連クラス:

```txt
SpawnManager
CyberWireMaterialApplier
PlacedPlantMaterialPolicy
PlacementManager
SurfaceAnchorController
```

---

## 山の花演出について

「あなたのカタチに降り注ぐメロディ」で山に表示される丸い花は、通常配置の花とは別です。

関連クラス:

```txt
MountainFlowerPointService
ProceduralMountainFlowerField
WorldRenderer.triggerMelodyMountainBloom()
```

現在の推奨設定:

```js
this.worldRenderer.triggerMelodyMountainBloom?.({
    count: 360,
    pointSize: 1.65,
    opacity: 0.96
});
```

数を増やすより、`pointSize` を大きくして密度感を補う方針です。

---

## リファクタリング方針

現在、責務が集中しやすいクラスがあります。

## 優先して分割するもの

### `WorldRenderer.js`

今後分離したい処理:

```txt
山花演出制御
エンディングシーケンス制御
配置植物の安定化
地形アンカー更新
流星演出
```

候補:

```txt
EndingSequenceController
MountainBloomController
PlacedObjectStabilizer
MeteorShowerEffect
```

---

### `SpawnManager.js`

今後分離したい処理:

```txt
material policy
water ripple
prism pulse
```

候補:

```txt
PlacedPlantMaterialPolicy
WaterRippleController
PrismPulseController
```

---

### `InteractionEventManager.js`

今後分離したい処理:

```txt
terrain click effect
placed object click interaction
water interaction
path interaction
```

候補:

```txt
TerrainClickEffectController
PlacedObjectInteractionController
WaterInteractionController
PathInteractionController
```

---

### `WordImpactEffectManager.js`

現在かなり多機能です。

分離候補:

```txt
WordMeteorEffect
WordIroBloomEffect
WordRainEffect
WordPrismEffect
WordToneEffect
```

---

## `_legacy` について

旧構成・未使用・重複設計のものは `_legacy` に退避しています。

例:

```txt
AppFlowManager.js
CinematicCamera.js
ClusterSpawnManager.js
LakeTerrainManager.js
GroundMaterialManager.js
WaterMaterialManager.js
PathMaterialManager.js
SurfaceClassifier.js
ModelRegistry.js
SpawnFactory.js
```

削除ではなく、一時退避です。

必要になった場合は、現行構成に合わせて整理して戻します。

---

## 今後の作業メモ

## 優先度 高

- `ProceduralMountainFlowerField.js` の完全正常化
- `PlacedPlantMaterialPolicy.js` の導入
- `SurfaceAnchorController.js` の導入
- 山花を山Groupローカルに固定
- 山・小島・水面の配置花を wire 表示で安定化
- `WorldRenderer.js` から山花生成ロジックを分離

## 優先度 中

- `WorldResonanceEffect` が常設花の material を壊さないようにする
- `PlacedFlowerLightPropagationEffect` の対象を wire material に限定する
- `EndingWorldResponseEffect` の material 書き換え対象を制限する
- `InteractionEventManager` から ground bloom と placement の干渉を分離

## 優先度 低

- `WordImpactEffectManager` の分割
- `ExperiencePhaseDirector` のフレーズ判定整理
- `MotionTimelineSynchronizer` の復元ロジック整理
- debug 用 seek panel の本番除外

---

## 注意点

## 1. ファイル修正は追記ではなく全置換すること

途中断片が残ると、以下のような壊れ方をします。

```js
export class Proced =export class ProceduralMountainFlowerField {
```

```js
export class PlacedPlantMaterial;export class PlacedPlantMaterialPolicy {
```

この状態になった場合は、対象ファイルを全削除してから正しいコードを貼り直してください。

---

## 2. 同じクラス内に同名メソッドを複数置かないこと

JavaScript の class では後ろの定義が勝ちます。

特に注意:

```txt
PlacementManager.applyFinalPlacedPlantDepthAnchor
PlacementManager.isDepthSafePlacedPlantId
WorldRenderer.lockCameraBehindMikuForEnding
WordImpactEffectManager.collectBloomTerrainMeshes
```

---

## 3. 毎フレーム Raycast を避けること

とくに山花演出では、以下を避けます。

```txt
花の数 x 毎フレーム Raycast
```

山花は近景配置ではなく背景演出なので、簡易式で点を生成し、Pointsで描画します。

---

## 4. 配置植物と一時演出植物を混ぜないこと

常設配置花:

```txt
PlacementManager / PlacedObjectRegistry 管理
```

一時演出花:

```txt
EphemeralBloomEffect / WordImpactEffectManager 管理
```

material を共有しないよう、`SpawnManager.makeInstanceMaterialsUnique()` を必ず通します。

---

## 5. TextAlive API の再生開始はユーザー操作後に行うこと

ブラウザの autoplay 制限があるため、音楽再生はユーザー操作後に行います。

---

## 現在の安定化キーワード

```txt
山花は Points
山花は山Groupローカル
通常花は wire only
配置固定は SurfaceAnchorController
花materialは PlacedPlantMaterialPolicy
WorldRendererは徐々に薄くする
```
