/**
 * ・配置済みオブジェクトを管理するレジストリ * PlacedObjectRegistry
 * ・位置チェックや用途別取得（Bloom対象など）を提供
 *
 * 主な機能：
 * ・オブジェクトの登録とメタデータ付与
 * ・配置済みオブジェクト一覧の取得
 * ・Bloom対象オブジェクトの抽出
 * ・配置時の最小距離チェック（重なり防止）
 * ・全オブジェクトのクリア
 *
 * 役割：
 * シーン内の「配置済みオブジェクト状態」を一元管理し、
 * 配置制御や描画処理（Bloom等）に必要な情報を提供する
 */

export class PlacedObjectRegistry {
    constructor(options = {}) {
        /**
         * 初期化
         *
         * ・オブジェクト格納配列を準備
         * ・最小間隔（配置制御用）を設定
         */

        // 登録済みオブジェクト配列
        this.objects = [];

        // 配置時の最小距離（XZ平面）
        this.minSpacing = options.minSpacing ?? 0.75;
    }

    add(object, metadata = {}) {
        /**
         * オブジェクトを登録
         *
         * 処理内容：
         * ・userData に配置メタ情報を付与
         * ・内部配列に追加
         *
         * 引数：
         * ・object   : Three.jsオブジェクト
         * ・metadata : 任意の付加情報（例：bloomable など）
         */

        if (!object) return;

        // 既存データを維持しつつメタデータをマージ
        object.userData.placementMetadata = {
            ...(object.userData.placementMetadata || {}),
            ...metadata
        };

        this.objects.push(object);
    }

    getAll() {
        /**
         * 登録済みオブジェクトをすべて取得
         *
         * 戻り値：
         * ・オブジェクト配列
         */

        return this.objects;
    }

    getBloomableObjects() {
        /**
         * Bloom対象オブジェクトを抽出
         *
         * 条件：
         * ・placementMetadata.bloomable が true
         *
         * 用途：
         * ・ポストプロセス（発光演出）対象の選定
         */

        return this.objects.filter(object => {
            return object?.userData?.placementMetadata?.bloomable;
        });
    }

    isTooClose(targetPoint, minSpacing = this.minSpacing) {
        /**
         * 指定位置が既存オブジェクトに近すぎるか判定
         *
         * 処理：
         * ・XZ平面で距離計算
         * ・minSpacing 未満なら配置不可とする
         *
         * 引数：
         * ・targetPoint : 判定対象位置
         * ・minSpacing  : 最小許容距離（省略時はデフォルト）
         *
         * 戻り値：
         * ・true  : 近すぎる（配置NG）
         * ・false : 問題なし
         */

        for (const existingObject of this.objects) {
            if (!existingObject) continue;

            const dx = existingObject.position.x - targetPoint.x;
            const dz = existingObject.position.z - targetPoint.z;

            // 水平方向距離（XZのみ）
            const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

            if (horizontalDistance < minSpacing) {
                console.log(
                    `[Placement Blocked] Too close. Distance: ${horizontalDistance.toFixed(3)}, Min: ${minSpacing}`
                );

                return true;
            }
        }

        return false;
    }

    clear() {
        /**
         * 登録済みオブジェクトを全削除
         *
         * 注意：
         * ・Three.jsオブジェクト自体は破棄しない
         * ・あくまでレジストリの参照のみクリア
         */

        this.objects = [];
    }
}