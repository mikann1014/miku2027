/**
 * SurfacePicker
 *
 * ・ポインタ（マウス / タッチ）や座標から地形サーフェスを取得する
 * ・Raycastを使ったサーフェス検出とエリア判定を提供
 *
 * 主な機能：
 * ・ポインタ位置からのヒット取得
 * ・指定座標の最上面サーフェス取得
 * ・地面（ground系）のY値サンプリング
 * ・指定エリアが特定サーフェスに限定されているか判定
 * ・指定エリアに特定サーフェスが含まれないか判定
 *
 * 役割：
 * 「どこに何があるか」を取得・判定する役割を担い、
 * 配置処理やインタラクションの基盤となる
 */

import * as THREE from 'three';

export class SurfacePicker {
    constructor(camera, renderer, options = {}) {
        /**
         * 初期化
         *
         * ・Raycasterを準備
         * ・サンプリング用のレイ設定を初期化
         */

        this.camera = camera;
        this.renderer = renderer;

        this.raycaster = new THREE.Raycaster();

        // 上からサーフェスを取得する際の開始高さ
        this.sampleRayStartHeight =
            options.sampleRayStartHeight ?? 80;

        // レイの長さ（最大探索距離）
        this.sampleRayLength =
            options.sampleRayLength ?? 300;
    }

    pickFromPointer(event, landObjects) {
        /**
         * ポインタ位置からサーフェスを取得
         *
         * 対応入力：
         * ・マウスイベント
         * ・タッチイベント
         *
         * 処理：
         * ・スクリーン座標 → 正規化デバイス座標（NDC）に変換
         * ・Raycastで最初のヒットを取得
         *
         * 戻り値：
         * ・hit（最も手前のオブジェクト）
         * ・ヒットなしの場合は null
         */

        const clientX =
            event.clientX ??
            event.touches?.[0]?.clientX;

        const clientY =
            event.clientY ??
            event.touches?.[0]?.clientY;

        if (
            clientX === undefined ||
            clientY === undefined
        ) {
            return null;
        }

        if (!this.renderer || !this.renderer.domElement) {
            console.warn(
                '[SurfacePicker] renderer or renderer.domElement is missing.'
            );
            return null;
        }

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            console.warn('[SurfacePicker] landObjects is empty.');
            return null;
        }

        const rect =
            this.renderer.domElement.getBoundingClientRect();

        // NDC（-1〜1）へ変換
        const mouse = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        );

        // カメラからレイ生成
        this.raycaster.setFromCamera(
            mouse,
            this.camera
        );

        const hits =
            this.raycaster.intersectObjects(
                landObjects,
                false
            );

        if (!hits || hits.length === 0) {
            return null;
        }

        // 最も手前のヒットのみ返す
        return hits[0];
    }

    sampleTopSurfaceAt(x, z, referenceY, landObjects) {
        /**
         * 指定XZ位置の「一番上のサーフェス」を取得
         *
         * 処理：
         * ・上方向から下にレイを飛ばす
         * ・複数ヒットの中から有効なサーフェスを抽出
         *
         * 対象サーフェス：
         * ・water / path / ground / island / mountain
         *
         * 除外：
         * ・ワイヤ（isWire）
         *
         * 戻り値：
         * ・{ point, object, surfaceType }
         * ・取得できない場合は null
         */

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            return null;
        }

        // 上方向からレイを落とす
        const origin =
            new THREE.Vector3(
                x,
                referenceY + this.sampleRayStartHeight,
                z
            );

        const direction =
            new THREE.Vector3(
                0,
                -1,
                0
            );

        const sampler =
            new THREE.Raycaster(
                origin,
                direction,
                0,
                this.sampleRayLength
            );

        const hits =
            sampler.intersectObjects(
                landObjects,
                false
            );

        if (!hits || hits.length === 0) {
            return null;
        }

        // 有効なサーフェスのみフィルタ
        const validHits =
            hits.filter(hit => {
                if (!hit || !hit.object) {
                    return false;
                }

                // ワイヤ系は除外
                if (hit.object.userData?.isWire) {
                    return false;
                }

                const surfaceType =
                    hit.object.userData?.surfaceType;

                return (
                    surfaceType === 'water' ||
                    surfaceType === 'path' ||
                    surfaceType === 'ground' ||
                    surfaceType === 'island' ||
                    surfaceType === 'mountain'
                );
            });

        if (validHits.length === 0) {
            return null;
        }

        const topHit =
            validHits[0];

        return {
            point: topHit.point.clone(),
            object: topHit.object,
            surfaceType: topHit.object.userData.surfaceType
        };
    }

    sampleTopGroundYAt(x, z, referenceY, landObjects) {
        /**
         * 指定位置の「地面系サーフェスのY座標」を取得
         *
         * 対象：
         * ・ground / mountain / island
         *
         * 戻り値：
         * ・Y座標
         * ・対象外または取得不可の場合は null
         */

        const hit =
            this.sampleTopSurfaceAt(
                x,
                z,
                referenceY,
                landObjects
            );

        if (
            !hit ||
            (
                hit.surfaceType !== 'ground' &&
                hit.surfaceType !== 'mountain' &&
                hit.surfaceType !== 'island'
            )
        ) {
            return null;
        }

        return hit.point.y;
    }

    isAreaAllowedSurfaceOnly({
        center,
        radius = 1.0,
        allowedSurfaceTypes = [],
        landObjects,
        referenceY = 0,
        sampleCount = 12,
        includeCenter = true
    }) {
        /**
         * 指定エリアが「許可されたサーフェスのみ」で構成されているか判定
         *
         * 処理：
         * ・中心＋円周上の複数ポイントをサンプリング
         * ・すべて allowedSurfaceTypes に含まれる必要あり
         *
         * 戻り値：
         * ・true  : すべて許可サーフェス
         * ・false : 1つでも不一致あり
         */

        if (!center) return false;

        if (
            !Array.isArray(allowedSurfaceTypes) ||
            allowedSurfaceTypes.length === 0
        ) {
            return false;
        }

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            return false;
        }

        const points = [];

        // 中心点
        if (includeCenter) {
            points.push(
                new THREE.Vector3(
                    center.x,
                    center.y,
                    center.z
                )
            );
        }

        // 円周上サンプル
        for (let i = 0; i < sampleCount; i++) {
            const angle =
                (i / sampleCount) * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        for (const point of points) {
            const hit =
                this.sampleTopSurfaceAt(
                    point.x,
                    point.z,
                    referenceY,
                    landObjects
                );

            // 取得不可 or 未許可サーフェスならNG
            if (!hit) {
                return false;
            }

            if (!allowedSurfaceTypes.includes(hit.surfaceType)) {
                return false;
            }
        }

        return true;
    }

    isAreaFreeOfSurfaceTypes({
        center,
        radius = 1.0,
        blockedSurfaceTypes = [],
        landObjects,
        referenceY = 0,
        sampleCount = 12,
        includeCenter = true
    }) {
        /**
         * 指定エリアに「禁止サーフェスが含まれていないか」判定
         *
         * 処理：
         * ・中心＋円周上をサンプリング
         * ・blockedSurfaceTypes が含まれていればNG
         *
         * 戻り値：
         * ・true  : 禁止サーフェス無し
         * ・false : 含まれている
         */

        if (!center) return false;

        if (!Array.isArray(landObjects) || landObjects.length === 0) {
            return false;
        }

        const points = [];

        if (includeCenter) {
            points.push(
                new THREE.Vector3(
                    center.x,
                    center.y,
                    center.z
                )
            );
        }

        // 円周サンプリング
        for (let i = 0; i < sampleCount; i++) {
            const angle =
                (i / sampleCount) * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                )
            );
        }

        for (const point of points) {
            const hit =
                this.sampleTopSurfaceAt(
                    point.x,
                    point.z,
                    referenceY,
                    landObjects
                );

            // ヒットしない場合はスルー（安全側）
            if (!hit) {
                continue;
            }

            if (blockedSurfaceTypes.includes(hit.surfaceType)) {
                return false;
            }
        }

        return true;
    }
}