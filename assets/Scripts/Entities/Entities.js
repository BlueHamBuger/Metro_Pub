// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html



var Car = cc.Class({
    name: "Car",
    properties: {
        id: { // id决定 车使用的 车辆的 类型
            default: 0,
            type: cc.Integer,
        },
        car_length: { // 车身的长度
            default: 1,
            type: cc.Integer,
        }
    },
});


module.exports = {
    Car: Car,
}