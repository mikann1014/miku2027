/**
 * ClusterPlacement
 *
 * ・オブジェクトを群生（クラスター）として配置するユーティリティ
 * ・中心点の周囲にランダム配置し、自然なばらつきを生成
 *
 * 主な機能：
 * ・指定位置を中心に複数オブジェクトの配置データを生成
 * ・半径・角度・スケールをランダム化して自然な見た目を作成
 * ・最小間隔を確保して密集しすぎないよう制御
 * ・選択中オブジェクトを一定割合で混ぜる
 *
 * 役割：
 * フラワーや草などの「群生表現」を簡単に実現し、
 * 見た目の自然さと配置のランダム性を担保する
 */

import * as THREE from 'three';

export class ClusterPlacement {
    constructor(spawnManager, options = {}) {
        /**
         * 初期化
         *
         * ・配置パラメータ（密度・スケール・分布）を設定
         * ・spawnManager から利用可能なモデルを取得可能にする
         */

        this.spawnManager = spawnManager;

        // =========================
        // クラスタ構成パラメータ
        // =========================

        // 中央の代表オブジェクトのスケール倍率
        this.centerScale = options.centerScale ?? 1.25;

        // 周囲に配置するオブジェクト数（ランダム範囲）
        this.minCount = options.minCount ?? 5;
        this.maxCount = options.maxCount ?? 8;

        // クラスタの広がり半径
        this.minRadius = options.minRadius ?? 0.85;
        this.maxRadius = options.maxRadius ?? 3.2;

        // 周囲オブジェクトのスケール範囲
        this.smallScaleMin = options.smallScaleMin ?? 0.32;
        this.smallScaleMax = options.smallScaleMax ?? 0.62;

        // 選択中オブジェクトを含める割合（例: 1/3）
        this.selectedRatio = options.selectedRatio ?? 1 / 3;

        // 配置同士の最小距離（密集防止）
        this.internalSpacing = options.internalSpacing ?? 0.34;

        // 使用するオブジェクトID一覧
        this.clusterObjectIds = options.clusterObjectIds ?? [
            'flower1',
            'flower2',
            'flower3',
            'Grass1',
            'Grass2',
            'Grass3'
        ];
    }

    createClusterTasks(centerPoint, selectedId, count = null) {
        /**
         * クラスタ配置タスクを生成
         *
         * 処理内容：
         * ・指定数（またはランダム数）の配置データを作成
         * ・最小距離を満たすようにリトライしながら配置
         *
         * 引数：
         * ・centerPoint : 中心位置
         * ・selectedId  : 選択中オブジェクトID
         * ・count       : 固定数（省略時はランダム）
         *
         * 戻り値：
         * ・配置情報の配列 [{ id, position, scaleMultiplier }]
         */

        const actualCount =
            count ??
            this.randomInt(
                this.minCount,
                this.maxCount
            );

        const tasks = [];
        const localPositions = [];

        let attempts = 0;

        // 無限ループ防止（試行上限）
        const maxAttempts = actualCount * 8;

        while (
            tasks.length < actualCount &&
            attempts < maxAttempts
        ) {
            attempts++;

            // ランダムな配置候補を生成
            const placementData =
                this.createRandomClusterPlacement(
                    centerPoint,
                    selectedId
                );

            // 既存配置との距離チェック
            if (
                this.isTooCloseToCluster(
                    placementData.position,
                    localPositions
                )
            ) {
                continue;
            }

            // 問題なければ追加
            localPositions.push(
                placementData.position.clone()
            );

            tasks.push(
                placementData
            );
        }

        return tasks;
    }

    createRandomClusterPlacement(centerPoint, selectedId) {
        /**
         * 単一のランダム配置データを生成
         *
         * 処理内容：
         * ・中心からランダムな角度・距離で位置を決定
         * ・配置するオブジェクトIDを選択
         * ・スケールをランダムに決定
         */

        // ランダム角度
        const angle =
            Math.random() * Math.PI * 2;

        // 半径（外側に行きやすい分布）
        const radius =
            THREE.MathUtils.lerp(
                this.minRadius,
                this.maxRadius,
                Math.sqrt(Math.random())
            );

        // 位置計算（XZ平面）
        const position =
            new THREE.Vector3(
                centerPoint.x + Math.cos(angle) * radius,
                centerPoint.y,
                centerPoint.z + Math.sin(angle) * radius
            );

        // 配置するオブジェクトID決定
        const id =
            this.chooseClusterObjectId(
                selectedId
            );

        // サイズ倍率
        const scaleMultiplier =
            THREE.MathUtils.lerp(
                this.smallScaleMin,
                this.smallScaleMax,
                Math.random()
            );

        return {
            id,
            position,
            scaleMultiplier
        };
    }

    chooseClusterObjectId(selectedId) {
        /**
         * 配置するオブジェクトIDを決定
         *
         * ルール：
         * ・利用可能なIDから選択
         * ・一定確率で「選択中オブジェクト」を含める
         * ・それ以外は別IDからランダム
         */

        const availableIds =
            this.getAvailableClusterObjectIds();

        if (availableIds.length === 0) {
            return selectedId;
        }

        const selectedAvailable =
            availableIds.includes(selectedId);

        // 約1/3の確率で選択中オブジェクト
        if (
            selectedAvailable &&
            Math.random() < this.selectedRatio
        ) {
            return selectedId;
        }

        // その他のID候補
        const otherIds =
            availableIds.filter(id => {
                return id !== selectedId;
            });

        if (otherIds.length === 0) {
            return selectedAvailable
                ? selectedId
                : availableIds[
                    Math.floor(Math.random() * availableIds.length)
                ];
        }

        return otherIds[
            Math.floor(Math.random() * otherIds.length)
        ];
    }

    getAvailableClusterObjectIds() {
        /**
         * 利用可能なオブジェクトID一覧を取得
         *
         * 処理：
         * ・spawnManager が存在する場合
         *   → 実際にロード済みのモデルのみ使用
         * ・存在しない場合
         *   → 全IDをそのまま返す
         */

        if (
            !this.spawnManager ||
            typeof this.spawnManager.hasModel !== 'function'
        ) {
            return [...this.clusterObjectIds];
        }

        return this.clusterObjectIds.filter(id => {
            return this.spawnManager.hasModel(id);
        });
    }

    isTooCloseToCluster(targetPoint, placedPositions) {
        /**
         * 既存配置との距離チェック
         *
         * ・XZ平面で距離を計算
         * ・指定した最小距離未満なら「近すぎる」と判定
         */

        if (!Array.isArray(placedPositions)) {
            return false;
        }

        for (const point of placedPositions) {
            if (!point) continue;

            const dx =
                point.x - targetPoint.x;

            const dz =
                point.z - targetPoint.z;

            const distance =
                Math.sqrt(dx * dx + dz * dz);

            if (distance < this.internalSpacing) {
                return true;
            }
        }

        return false;
    }

    randomInt(min, max) {
        /**
         * min〜max の整数乱数を生成（両端含む）
         */

        return Math.floor(
            Math.random() * (max - min + 1)
        ) + min;
    }
}