// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

var Infrastructure = require("Infrastructure")
cc.Class({
    extends: Infrastructure,
    properties: {
        // track 的size 的 y 必须为 棋盘的y长度
        size: {
            get() {
                if (Infrastructure.MetroMng != null) {
                    let floor_size = Infrastructure.MetroMng.getFloorGridSize()
                    return cc.v2(this.single_size.x, floor_size.y)
                } else
                    return this.single_size
            },
            set(value) {
                this._size = value
            },
            override: true,
        },
        // 默认的单个长度
        single_size: {
            default: cc.v2()
        },
        idx: { // track 的 idx 都从y = 0 的位置开始
            get() {
                return this._idx
            },
            set(value) {
                if (value != null)
                    this._idx = cc.v2(value.x, 0)
                else
                    this._idx = null
            },
            override: true
        },
        dir: {
            get() {
                return this._dir
            },
            set(value) {

                if (this.node != null) {
                    if (value != this._dir) {
                        this._dir = value
                        this.onBaseFloorChange()
                        let default_pos = Infrastructure.MetroMng.idx2pos(this.idx)
                        this._transformByDir(default_pos)
                    }
                }

            }
        },
    },
    ctor() {
        this._idx = null
        this.type = Infrastructure.InfrasTypes.Track
        this.endurance_limit = 100
        this.endurance = 100

        this._dir = true // 该track 的方向 true 为右到左  否则为左到右

        // track左边的 floor 建筑
        this.beside_floors = []
    },
    start() {
        this._super(null);
    },
    transformIdx(idx) {
        this.idx = idx
        return this.idx
    },
    move(elem_pos_info) { //移动设备
        this.view.onMove()
        this.idx = elem_pos_info[1] // 
        this._transformByDir(elem_pos_info[0])
    },

    //回调
    onBaseFloorChange() {
        this.beside_floors = Infrastructure.MetroMng.getBesideFloors(this)
        console.log(this.beside_floors);
    },
    onDepart(metro_idx = 0) {
        let metro_prefab = Infrastructure.MetroMng.metro_prefabs[metro_idx]
        var metro = cc.instantiate(metro_prefab)

        metro.setParent(this.node)
        metro.getComponent("Metro").init(this, 2)
        metro.setPosition(0, 0, 0)
    },

    //调用
    getNextWaitPos(idx) {
        let floor = null
        let pos = null
        if (this.dir) {
            floor = this.beside_floors[idx]
            if (floor == undefined || floor == null) {
                return null
            }
            let bound = floor.getBounding()
            pos = Infrastructure.MetroMng.idx2pos(cc.v2(bound.xMax, bound.yMax))
        } else {
            floor = this.beside_floors[this.beside_floors.length - idx - 1]
            if (floor == undefined || floor == null) {
                return null
            }
            let bound = floor.getBounding()
            pos = Infrastructure.MetroMng.idx2pos(cc.v2(bound.xMin, bound.yMin))
        }


        return this.node.convertToNodeSpaceAR(pos)
    },
    onMetroWaitEnter(idx, metro) {
        let floor = null
        if (this.dir) {
            floor = this.beside_floors[idx]
        } else {
            floor = this.beside_floors[this.beside_floors.length - idx - 1]
        }
        if (floor == undefined || floor == null) {
            return null
        }
        floor.onMetroWaitEnter(metro)

    },
    onMetroWaitExit(idx, metro) {
        let floor = null
        console.log("inside");

        if (this.dir) {
            floor = this.beside_floors[idx]
        } else {
            floor = this.beside_floors[this.beside_floors.length - idx - 1]
        }
        if (floor == undefined || floor == null) {
            return null
        }
        console.log("flooree");
        floor.onMetroWaitExit(metro)

    },
    _transformByDir(default_pos) {
        if (this.dir) {
            this.node.eulerAngles = cc.v3(this.node.eulerAngles.x, 0, this.node.eulerAngles.z)
            this.node.setPosition(default_pos)
        } else {
            this.node.eulerAngles = cc.v3(this.node.eulerAngles.x, 180, this.node.eulerAngles.z)
            this.node.setPosition(default_pos.x + this.size.x * 10, default_pos.y, default_pos.z - this.size.y * 10)
        }
    }


    // update (dt) {},
});