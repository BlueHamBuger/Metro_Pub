// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html
var BaseFloor = require("BaseFloor")
cc.Class({
    extends: cc.Component,
    properties: {
        baseFloor: {
            type: BaseFloor,
            default: null,
        },
        grid_pos: {
            type: cc.Vec2,
            get: function() {
                return this._grid_pos
            },
            set: function(value) {
                this._grid_pos = value
                let loc = this.baseFloor.idx2pos(this._grid_pos)
                console.log(loc);

                this.node.setPosition(loc)
            }

        }

    },
    ctor() {
        this._grid_pos = cc.v2()

    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    start() {
        this.grid_pos = cc.v2(16, 0)
    },

    // update (dt) {},
});