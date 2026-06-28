# 世界最後の音楽隊 - Three.js / TextAlive Interactive Music World

初音ミク「マジカルミライ 2026」プログラミング・コンテスト応募作品 **「世界最後の音楽隊」** の楽曲進行に合わせて、Three.js の3D世界・歌詞・インタラクション・配置オブジェクト・演出が変化する WebGL 作品です。

このリポジトリは、TextAlive App API による楽曲同期、Three.js によるプロシージャル地形、初音ミクモデルのモーション制御、歌詞表示、クリック配置、山・湖・小島・花・音符・エンディング演出を組み合わせた音楽体験を実装しています。

本作品は **静的Webアプリケーション** です。  
サーバーサイド処理は必要なく、HTTPサーバー上に設置するだけで動作する構成にしています。

---

## 目次

- [作品アピール](#作品アピール)
- [概要](#概要)
- [動作環境](#動作環境)
- [起動方法](#起動方法)
- [操作方法](#操作方法)
- [ディレクトリ構成](#ディレクトリ構成)
- [主要ファイルと責務](#主要ファイルと責務)
- [配置オブジェクトとマテリアル方針](#配置オブジェクトとマテリアル方針)
- [山の花演出について](#山の花演出について)
- [実装上の注意](#実装上の注意)
- [補足](#補足)

---

## 作品アピール

初音ミクとともに楽曲世界を歩き、歌詞の情景そのものを体験する作品です。曲に合わせて空や環境は変化し、プレイヤーが花を咲かせたり景色に触れたりすると、世界が静かに応答します。歌詞に込められた「色の生成」「感情の受容」「未来への継承」を、空の変化、光、音符、ミクの動き等で表現しました。

---

## 概要

この作品では、楽曲の進行に応じて以下のような変化が起こります。

- 歌詞に応じた空色・環境色の変化
- 初音ミクの歩き・走り・停止・手を伸ばす・崩れ落ちる・再登場などのモーション遷移
- 青い音符の出現、追従、軌道運動、上昇
- 歌詞の浮遊表示、引き寄せ、霧散
- 湖・道・小島・山への花・草・葉の配置
- 山に咲く花の演出
- エンディングの空・タイトル表示

ユーザーは画面内の地形をクリックすることで、花・草・葉などのオブジェクトを配置できます。  

---

## 動作環境

推奨環境:

- Google Chrome 最新版
- WebGL が有効な環境
- インターネット接続
- ローカルHTTPサーバー、または任意の静的Webサーバー

注意:

- `index.html` を `file://` で直接開くのではなく、必ずHTTPサーバー経由で起動してください。
- TextAlive App API の再生開始には、ブラウザの autoplay 制限によりユーザー操作が必要です。
- Three.js / WebGL を使用しているため、端末やブラウザの描画性能によって表示負荷が変わる場合があります。

---

## 起動方法

### 推奨: プロジェクト直下でサーバーを起動する場合

プロジェクト直下で以下を実行します。

```bash
python -m http.server 8001
```

ブラウザで以下を開きます。

```txt
http://127.0.0.1:8001/src/
```
---

### 別の起動方法: `src` ディレクトリでサーバーを起動する場合

```bash
cd src
python -m http.server 5173
```

ブラウザで以下を開きます。

```txt
http://127.0.0.1:5173/
```

---

### 任意の静的サーバーを使用する場合

任意の静的HTTPサーバーでも起動できます。

例:

```bash
npx serve .
```

プロジェクト直下を公開した場合は、ブラウザで以下にアクセスしてください。

```txt
http://localhost:3000/src/
```

`src` ディレクトリを公開ルートにした場合は、以下のようにアクセスしてください。

```txt
http://localhost:3000/
```

---

## 操作方法

1. タイトル画面で「クリックして接続」を押します。
2. 音楽データの準備後、「クリックして歌を聴く」を押します。
3. 楽曲が進行すると、歌詞、空、環境色、ミクのモーション、各種演出が変化します。
4. 配置メニューが表示されたあと、左側のボタンで花・草・葉を選択できます。
5. 湖・道・小島・山などをクリックすると、選択中のオブジェクトを配置できます。

---

## ディレクトリ構成

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
└── ui/
```

---

### `src/assets`

GLBモデルなどの3Dアセットを配置しています。

主なアセット:

```txt
MikuWalk.glb
MikuRun.glb
MikuStop.glb
MikuTurn.glb
MikuHand.glb
MikuHart.glb
MikuStoptoCollapse.glb
flower1.glb
flower2.glb
flower3.glb
Grass1.glb
Grass2.glb
Grass3.glb
Leaf.glb
Prism1.glb
Prism2.glb
Prism3.glb
Ripple.glb
tone.glb
lake2.glb
```

---

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

---

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

---

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

---

### `src/materials`

配置オブジェクト、とくに花・草・葉のマテリアル方針を分離するためのディレクトリです。

```txt
PlacedPlantMaterialPolicy.js
```

---

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

---

### `src/terrain`

プロシージャル地形と山・水面・道・小島などの生成を担当します。

```txt
TerrainMaterialFactory.js
TerrainFadeController.js
BackgroundMountainController.js
MountainFlowerPointService.js
generators/
utils/
```

---

## 主要ファイルと責務

### `main.js`

アプリケーション起動、TextAlive連携、入力イベント、楽曲進行に応じた更新の入口です。

主な責務:

- `WorldRenderer` の生成
- `MusicManager` の生成
- `UIManager` の生成
- `MotionDirector` / `ExperiencePhaseDirector` の生成
- TextAlive の `onTimeUpdate` から楽曲同期処理を実行
- 毎フレーム `worldRenderer.update()` を呼び出す

---

### `WorldRenderer.js`

Three.js のシーン全体を管理します。

主な責務:

- `scene`, `camera`, `renderer` の生成
- マネージャ群の初期化
- GLBモデル読み込み
- プロシージャル地形生成
- 毎フレーム更新
- 山花演出、エンディング演出、流星、フェードアウトなどの橋渡し

このクラスは描画世界の中心として、各マネージャやエフェクトを接続する役割を持ちます。

---

### `MusicManager.js`

TextAlive App API との連携、楽曲再生、楽曲時間の管理を担当します。

主な責務:

- TextAlive Player の生成・管理
- 再生状態の管理
- 楽曲時間の取得
- 歌詞・ビート・楽曲進行に応じたイベント連携
- ユーザー操作後の再生開始処理

---

### `CharacterManager.js`

初音ミクモデルの状態管理を担当します。

主な責務:

- `MikuEntity` の生成・保持
- アニメーション制御との接続
- モーション状態の更新
- 楽曲フェーズに応じたキャラクター挙動の橋渡し

---

### `MikuAnimationController.js`

初音ミクのアニメーション遷移を管理します。

主な責務:

- 歩行・走行・停止・ターンなどの再生
- アニメーション間の切り替え
- フェードやミックス処理
- 楽曲進行に応じたモーション変更

---

### `MotionDirector.js`

楽曲進行に応じたモーション全体の指揮を担当します。

主な責務:

- `MikuMotionController` の制御
- `VisualMotionController` の制御
- `InteractionMotionController` の制御
- 楽曲フェーズに応じたモーション状態の決定

---

### `ExperiencePhaseDirector.js`

楽曲全体のフェーズ管理を担当します。

主な責務:

- 楽曲時間に応じたフェーズ判定
- フェーズごとの演出トリガー
- 後半演出や終盤演出への移行管理

---

### `SpawnManager.js`

登録済みGLBモデルを複製してシーンへ配置します。

主な責務:

- モデル登録
- モデル複製
- material clone による個体ごとのマテリアル分離
- `CyberWireMaterialApplier` の適用
- 水面リップル管理
- 花・草・葉のマテリアル補正を `PlacedPlantMaterialPolicy` に委譲

---

### `PlacementManager.js`

クリック配置を管理します。

主な責務:

- クリック位置から地形判定
- 水面・地面・山・小島への配置分岐
- クラスター配置
- 配置オブジェクト登録
- `SurfaceAnchorController` による地形ローカル固定

---

### `ProceduralTerrainManager.js`

一部のGLBアセットとプロシージャル生成を組み合わせて、地形を生成します。

生成対象:

- 湖
- 中央の道
- 小島
- 飛び石
- 左右の山
- 遠景山

---

### `ProceduralMountainFlowerField.js`

「あなたのカタチに降り注ぐメロディ」付近で表示される、山に咲く丸い花の演出です。

現在の方針:

- `Points` ベースで描画
- `InstancedMesh` の毎フレーム billboard 更新は使わない
- 毎フレーム Raycast しない
- 山側の `Group` を anchor にして、山と一緒に動くようにする
- 数を増やしすぎず、`pointSize` を大きくして密度感を補う

---

### `MountainFlowerPointService.js`

山花のローカル座標を生成する専用クラスです。

主な責務:

- 左右の山ごとに点群を作る
- Raycast を使わない軽量な簡易式で山上に見える位置を生成
- `leftMountainGroup` / `rightMountainGroup` に対応した batch を返す

---

### `PlacedPlantMaterialPolicy.js`

配置された花・草・葉の見た目を安定化します。

方針:

- 面は描画しない
- wire のみ発色
- wire はミクとの前後関係を考慮する
- エフェクト後にマテリアルが変化しても復元できる

---

### `SurfaceAnchorController.js`

配置オブジェクトを、必要に応じて地形メッシュのローカル座標に固定するためのクラスです。

主な責務:

- 配置時に `surfaceAnchorObject` と `surfaceAnchorLocalPosition` を保存
- 毎フレーム anchor の現在位置から world 座標を再計算
- 現在は主に `mountain` への配置で使用する
- `ground` / `water` / `island` は terrain chunk 再利用によるワープを避けるため、基本的に world 座標固定にする

---

## 配置オブジェクトとマテリアル方針

### 通常配置植物

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
ミクの奥にある配置物はミクに隠れる
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

### 配置オブジェクトの固定方針

配置オブジェクトは、配置された surface type によって固定方法を変えます。

```txt
mountain:
  surfaceAnchorObject のローカル座標に固定する
  山がミク移動に追従して動くため、花も山と一緒に動かす

ground / water / island:
  world 座標に固定する
  terrain chunk の再利用時に配置物が奥へワープするのを防ぐ
```

このため、`SurfaceAnchorController` は主に `mountain` 配置で使用し、それ以外は `anchorPosition` による world 固定を優先します。

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

## 実装上の注意

### 1. HTTPサーバー経由で起動すること

`file://` で直接 `index.html` を開くと、ES Modules、GLB、TextAlive App API、外部CDNの読み込みで問題が起こる可能性があります。

必ずHTTPサーバー経由で開いてください。

---

### 2. 静的Webアプリケーションとして動作すること

この作品は静的Webアプリケーションです。  
HTTPサーバー上に設置するだけで動作する構成にしています。

---

## 補足

TextAlive App API は、音楽に合わせてタイミングよく歌詞が動くWebアプリケーションを開発するための JavaScript API です。

本作品では `textalive-app-api` を importmap 経由で読み込み、楽曲・歌詞・再生位置に同期して Three.js の3D演出を制御しています。
