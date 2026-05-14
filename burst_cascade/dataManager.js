/**
 * DataManager
 * 将来の共通基盤化を見据えた、ローカルストレージのマイグレーション対応データ管理クラス
 */

export const DataManager = {
    /**
     * 現在のメジャーバージョンを取得する。
     * Vite によって注入される __APP_VERSION__ を元に算出。
     * 例: "0.1.0" -> 0, "1.2.3" -> 1
     */
    getCurrentMajorVersion() {
        return parseInt(__APP_VERSION__.split('.')[0], 10);
    },

    /**
     * 内部マイグレーションエンジン
     * 保存されているデータバージョンから現在のメジャーバージョンまで、順次変換を適用する。
     * 
     * @param {Object} data 移行対象のデータ
     * @param {Object} migrationMap マイグレーションマップ
     * @returns {Object} 移行後のデータ
     */
    _migrate(data, migrationMap) {
        let currentDataVersion = data.dataVersion !== undefined ? data.dataVersion : -1;
        const appVersion = this.getCurrentMajorVersion();

        // Object.keys からバージョン番号(数字)だけを取り出し、昇順にソート
        const versions = Object.keys(migrationMap)
            .filter(key => key !== 'init')
            .map(Number)
            .filter(num => !isNaN(num))
            .sort((a, b) => a - b);

        for (const version of versions) {
            // 保存データのバージョンより新しく、かつアプリの現在のバージョン以下のものを適用
            if (currentDataVersion < version && version <= appVersion) {
                data = migrationMap[version](data);
                currentDataVersion = version;
            }
        }

        return data;
    },

    /**
     * ローカルストレージからデータを取得し、必要に応じて初期化およびマイグレーションを行う。
     * 取得されたデータには dataVersion プロパティは含まれない。
     * 
     * @param {string} key 保存キー
     * @param {Object} migrationMap マイグレーション定義 ({ init: () => {}, 1: (data) => {} ... })
     * @returns {Object} クリーンなデータ
     */
    getSavedData(key, migrationMap) {
        if (!migrationMap || typeof migrationMap.init !== 'function') {
            throw new Error('DataManager.getSavedData: migrationMap.init is required.');
        }

        const rawJson = localStorage.getItem(key);
        let data;

        if (!rawJson) {
            // データ不在時は初期化ロジックを実行
            data = migrationMap.init();
        } else {
            try {
                data = JSON.parse(rawJson);
            } catch (e) {
                console.warn(`DataManager: Failed to parse data for key "${key}". Falling back to init().`, e);
                data = migrationMap.init();
            }

            // マイグレーションの実行
            data = this._migrate(data, migrationMap);
        }

        // 利用側には dataVersion を隠蔽する
        if (data && typeof data === 'object') {
            delete data.dataVersion;
        }

        return data;
    },

    /**
     * ローカルストレージにデータを保存する。
     * 保存直前に、現在のメジャーバージョンを dataVersion として付与して永続化する。
     * 
     * @param {string} key 保存キー
     * @param {Object} data 保存するデータ
     */
    setSavedData(key, data) {
        if (!data || typeof data !== 'object') {
            throw new Error('DataManager.setSavedData: data must be an object.');
        }

        // dataVersion を付与したクローンを作成して保存する (元のオブジェクトは汚染しない)
        const dataToSave = {
            ...data,
            dataVersion: this.getCurrentMajorVersion()
        };

        localStorage.setItem(key, JSON.stringify(dataToSave));
    }
};
