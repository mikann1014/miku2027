/**
 * Lyric Utilities
 *
 * ・歌詞テキストの正規化や進行度計算を行うユーティリティ群
 * ・フレーズとワードの組み合わせ処理を提供
 *
 * 主な機能：
 * ・歌詞文字列の不要文字除去（括弧・空白）
 * ・フレーズの再生進行度（0〜1）の算出
 * ・フレーズとワードの結合
 *
 * 役割：
 * 歌詞表示・同期処理に必要な文字列整形と時間ベース計算を担う
 */

export function normalizeLyricText(text) {
    /**
     * 歌詞テキストを正規化する
     *
     * 処理内容：
     * ・null / undefined を空文字に変換
     * ・「」や『』などの装飾括弧を除去
     * ・すべての空白（スペース・改行）を削除
     * ・trimで前後の空白も除去
     *
     * 用途：
     * ・比較用キー生成
     * ・表示差分検知
     */

    return String(text || '')
        .replace(/[「」『』]/g, '')
        .replace(/\s/g, '')
        .trim();
}

export function getPhraseProgress(position, phrase) {
    /**
     * フレーズの再生進行度を 0〜1 で返す
     *
     * 引数：
     * ・position : 現在の再生位置（時間）
     * ・phrase   : { startTime, endTime } を持つオブジェクト
     *
     * 処理：
     * ・開始前 → 0
     * ・終了後 → 1
     * ・それ以外 → 線形補間で進行度を算出
     *
     * 無効データ：
     * ・start/end が数値でない
     * ・end <= start
     * の場合は 0 を返す
     *
     * 用途：
     * ・歌詞の表示アニメーション
     * ・進捗に応じた演出制御
     */

    const startTime = phrase?.startTime;
    const endTime = phrase?.endTime;

    if (
        typeof startTime !== 'number' ||
        typeof endTime !== 'number' ||
        endTime <= startTime
    ) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            (position - startTime) / (endTime - startTime),
            1
        )
    );
}

export function combineText(normalizedPhrase, normalizedWord) {
    /**
     * 正規化済みフレーズと単語を結合する
     *
     * 処理：
     * ・どちらかが null / undefined の場合でも空文字として扱う
     * ・単純連結して1つの文字列を作成
     *
     * 用途：
     * ・歌詞の逐次表示
     * ・一致判定用の連結キー生成
     */

    return `${normalizedPhrase || ''}${normalizedWord || ''}`;
}