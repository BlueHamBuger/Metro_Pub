// DataManaget 将entitie 连接到游戏的资源（预制体等等完成资源的加载）

var Entities = require("Entities")
var Effect = cc.Class({
    name: "Effects",
    properties: {
        connect_line: { // 连接的线段样式
            default: [],
            type: [cc.Prefab]
        }
    },
    statics: { //存储各个特效的id
        CONNECT_LINE: 0, //
    },
    getEffect(id, idx) {
        switch (id) {
            case Effect.CONNECT_LINE:
                return this.connect_line[idx]
        }
    },

})
window.GB_Effect = Effect
var DataType = window.GB_DataType = {
    CAR_PREFAB: 0,
    STATION_TEX: 1,
}

cc.Class({
    extends: require("BaseManager"),
    properties: {
        cars: {
            default: [],
            type: [cc.Prefab]
        },
        effects: {
            default: null,
            type: Effect
        },
        station_sprites: {
            default: [],
            type: [cc.SpriteFrame]
        },
    },
    loadData(type, param) {
        switch (type) {
            case DataType.CAR_PREFAB:
                let entity = param
                let car = cc.instantiate(this.cars[entity.id])
                let metro_car = car.getComponent("MetroCar")
                metro_car.init(entity.car_length, entity.id)
                return metro_car
            case DataType.STATION_TEX:
                let idx = param
                return this.station_sprites[idx]
        }
    },
    getEffect(id, idx) {
        return this.effects.getEffect(id, idx)
    },
    initManager(gameMng) {
        this._super(gameMng)
    },
    onGameStart(loaded_callback) { //在加载完数据之后将会调用对应的回调来开始游戏
        this.loadStations(loaded_callback)
    },
    loadStations(callback) { //加载并组织站点信息
        cc.loader.loadRes("Datas/Station_Datas", cc.JsonAsset, (err, json) => {
            this.station_datas = json.json
            this.station_datas.forEach(city => {
                let city_id = city.city_id
                let maped_id = Math.mapInto(city_id)
                city.color = cc.Color.getBrightColor(maped_id)
                city.tex = this.station_sprites[Math.abs(maped_id % this.station_sprites.length)]
                let city_hsv = city.color.toHSV()
                cc.Color.prototype.fromHSV()
                city.line_sta.forEach(line => {
                    //console.log(Math.mapInto(maped_id + line.line_id))
                    let num = Math.mapInto(maped_id + line.line_id)
                    let bit8 = (1 << 8) - 1
                    let h = city_hsv.h + ((num & bit8) / 255 - 0.5) * 2 * 0.1
                    h = h > 1.0 ? 1.0 : (h < 0 ? 0 : h)
                    num >>= 8
                    let s = city_hsv.s + (num & bit8) / 255 * 0.1
                    s = s > 1.0 ? 1.0 : s
                    num >>= 8
                    let v = city_hsv.v + (num & bit8) / 255 * 0.1
                    v = v > 1.0 ? 1.0 : v
                    line.color = new cc.Color()
                    line.color.fromHSV(h, s, v)
                    line.station.forEach(sta => {
                        sta.exist = false // 站点是否被生成
                    })
                });
            });

            callback(err)
        })
    },

})