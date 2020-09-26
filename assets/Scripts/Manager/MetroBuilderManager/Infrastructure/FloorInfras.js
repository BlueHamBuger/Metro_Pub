// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html


// floor infras 上可以以某个系数来生成 human
// 人数的生成速度相对于是 体力的回复机制，和车辆的数量（质量）来决定人数的消耗
//由人数的搭乘数量来最终决定获取的资源
var Human = require("Human")
var Infrastructure = require("Infrastructure")
var FloorInfrasViewDatas = cc.Class({
    name: "FloorInfrasViewDatas",
    properties: {
        //UIs
        stretch_point: {
            type: cc.Node,
            default: null,
        }
    },
})
var FloorInfrasView = cc.Class({
    extends: Infrastructure.InfrasView,
    __ctor__(infras) {
        // 调用父类的方法（使用的 是 js 的默认语法）
        Infrastructure.InfrasView.call(this, infras)
        this.view_datas = infras.view_datas;
        this.view_datas.stretch_point.active = false
    },
    init() {},
    onStretch(size) {
        this.infras_node.setScale(size.x, this.infras_node.scaleY, size.y)
        this.view_datas.stretch_point.setScale(4.0 / size.x, 4.0, 4.0 / size.y)
    },
    onResume() {
        this._super()
        this.view_datas.stretch_point.active = false
    },
    onSelect(construactable) {
        this._super(construactable)
        this.view_datas.stretch_point.active = true
    },


})

var FloorInfras = cc.Class({
    extends: Infrastructure,
    statics: {
        //默认 0.5分钟一个人？
        std_pop_interval: 4.0,
        // 大小和面积比例
        // 一个位置最多两个
        std_capacity_area_rate: 2,
        // floor的高度 这个由 模型直接决定
        std_floor_y: 0.7,
        std_floor_x: 1.0,
        std_floor_z: 1.0,
        std_mesh_scale: 10.0,

    },
    properties: {
        pop_interval: { // 人数增长速率
            get() {
                return FloorInfras.std_pop_interval / this.attraction
            },
        },
        size: {
            get() {
                return this._size
            },
            set(value) {
                this._size = value
                if (this.node != null) {
                    this.view.onStretch(value)
                }
            },
            override: true,
        },
        view_datas: {
            type: FloorInfrasViewDatas,
            default: null,
        },
        tar_size: {
            get() { return this._tar_size },
            set(value) {
                this._tar_size = value;
                if (this.node != null) {
                    this.view.onStretch(value)
                }
            }
        },

    },

    //基本属性
    ctor() {
        //public
        // 当前的人数
        // this.population = 0;
        // 该地面的吸引力，决定 人增长速率
        // 由 该方块上的
        this.attraction = 1.0;
        // 可容纳的人数上限 由 size 决定
        this.capacity = FloorInfras.std_capacity_area_rate * 1;

        //private
        this._elapesed_time = 0.0
            // 当前的humans
        this._humans = []
            // 当前的 size
        this._size = cc.Vec2.ONE
            // 调整后的 size
        this._tar_size = cc.Vec2.ONE;
        this.type = Infrastructure.InfrasTypes.Floor


    },
    start() {
        this._super(FloorInfrasView);
        this._cur_pos = this.node.getPosition();

        // let view = new FloorInfrasView(this)

    },
    update(dt) {
        this._elapesed_time += dt;
        this._pop_update()
    },
    // 人数更新
    _pop_update() {
        if (this._elapesed_time >= this.pop_interval) {
            if (this._humans.length < this.capacity)
                this._pop_add()
            this._elapesed_time = 0.0
        }
    },
    _pop_add() {
        //var human = cc.instantiate()
        // var human = new Human()
        // human.init(this)
        let human_prefab = Infrastructure.MetroMng.gameMng.getRandomPrefab(Window.Builder_Prefab_Types.Human)
        var human_node = cc.instantiate(human_prefab)
        var scene = cc.director.getScene();
        human_node.parent = scene
        var human = human_node.getComponent("Human")
        human.init(this, this._humans.length)
        this._humans.push(human)
    },
    // 回调

    // event
    onStretchTouchEnter() {
        this.view.onSelect(true)
    },
    onStretchTouch(size, construactable) {
        this.tar_size = size
        this.view.onSelect(construactable)
    },
    onStretchTouchEnd(construactable) {
        this.view.onSelect(true)
        if (construactable) {
            // 成功
            let cost_diff = this.getCostBySize(this.tar_size) - this.getCostBySize(this.size)
            if (cost_diff > 0)
                Infrastructure.MetroMng.gameMng.spendCoin(cost_diff)
            else // 返回一般的钱
                Infrastructure.MetroMng.gameMng.addCoin(Math.ceil(-cost_diff / 2))

            this.size = this.tar_size
            this.capacity = FloorInfras.std_capacity_area_rate * Math.abs(this.size.x) * Math.abs(this.size.y)


        } else {
            //失败
            this.tar_size = this.size
        }
        //this.view.onResume()
    },
    onMetroWaitEnter(metro) {
        for (const h of this._humans) {
            h.informWait(metro)
        }
    },
    onMetroWaitExit(metro) {
        console.log(metro);
        for (const h of this._humans) {
            h.informDepart(metro)
        }
    },
    removeHuman(h) {
        this._humans[h.idx] = this._humans[this._humans.length - 1]
        this._humans[h.idx].idx = h.idx
        this._humans.length -= 1
    },

    //state
    isConstructable() {
        if (this.tar_size.x == 0 || this.tar_size.y == 0) {
            return false
        } else {
            return true
        }
    },
    getHumanNum() {
        return this._humans.length
    },
    getNextHumanRemain() {
        return this.pop_interval - this._elapesed_time
    },
    getCost() {
        return this.cost * Math.abs(this.size.x * this.size.y)
    },
    getCostBySize(size) {
        return this.cost * Math.abs(size.x * size.y)
    }



});