// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var Entities = require("Entities")

cc.Class({
    extends: require("BaseManager"),

    properties: {
        user_id: { // 八维通的用户id
            default: 0,
            type: cc.Integer,
        },
        coin: {
            default: 1000,
            type: cc.Integer,
        },
        car_selected: { // 玩家当前选择的车辆
            default: null,
            type: Entities.Car,
        }
    },
    initManager(gameMng) {
        this._super(gameMng)

    },
    addCoin(n) {
        this.coin += n
    },
    spendCoin(n) {
        this.coin -= n
    }
    // LIFE-CYCLE CALLBACKS:

    // start() {

    // },

    // update (dt) {},
});