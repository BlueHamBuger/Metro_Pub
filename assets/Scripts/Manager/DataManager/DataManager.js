// DataManaget 将entitie 连接到游戏的资源（预制体等等完成资源的加载）

var Entities = require("Entities")
cc.Class({
    extends: require("BaseManager"),
    properties: {
        cars: {
            default: [],
            type: [cc.Prefab]
        }
    },
    loadData(entity) {
        switch (cc.js.getClassName(entity)) {
            case "Car":
                let car = cc.instantiate(this.cars[entity.id])
                let metro_car = car.getComponent("MetroCar")
                metro_car.init(entity.car_length, entity.id)
                return metro_car
        }
    },
    initManager(gameMng) {
        this._super(gameMng)
    }

})