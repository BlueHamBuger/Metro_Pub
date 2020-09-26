var BaseFloorView = cc.Class({
    name: "BaseFloorView",

    properties: {
        grid_radius: 10.0,
        line_width: 0.5,
        size: cc.v2(2048, 2048),
        mat: {
            type: cc.Material,
            default: null,
        }
    },
    statics: {},
    ctor() {},
    init(grids) {
        this.mat.setProperty("grid_radius", this.grid_radius)
        this.mat.setProperty("line_width", this.line_width)
        this.mat.setProperty("size", this.size)
        this.infoMap = new cc.Texture2D()
        this.infoMap.initWithData(grids, 11, this.size.x, this.size.y)
        this.options = {
            width: this.size.x,
            height: this.size.y,
            level: 1,
            flipY: false,
            images: [grids],
            premultiplyAlpha: false,
            genMipmaps: false,
            format: 11, //cc.Texture2D.PixelFormat.AI88, //TEXTURE_FMT_L8_A8m,
            minFilter: 0,
            magFilter: 0
        }
        this.mat.setProperty("info_map", this.infoMap)
    },
    //TODO 
    //如果直接转送整个 地图的 infoMap的话
    //太大会导致 GPU 的 位宽瓶颈
    // 所以要将 BaseFloor 进行分区块操作，减少一次性传输的数据
    updateTex(grids) {
        this.infoMap.update(this.options)
    }
})


cc.Class({
    extends: cc.Component,
    properties: {
        view: {
            type: BaseFloorView,
            default: null
        },
    },
    editor: {
        executeInEditMode: true,
    },
    ctor() {
        this.mat = null
        this.grids = null
        this.view = null
        this.former_zone = [0, cc.Vec2.ZERO] // 记录之前的选定区域
        this.selectZone = new ZoneConstructor(this)
    },
    onLoad() {
        var size = this.view.size
        this.node.setScale(size.x / 10.0, 1.0, size.y / 10.0)
        this.node.setPosition(size.x / 2.0, 0.0, -size.x / 2.0);
        let count = size.x * size.y * 2
        this.grids = new Uint8Array(count);
        this._originIdx = cc.Vec2.floor(this.idx2pos(cc.v2(0, 0))) // 左下角的 格子的 index
        this.initGrids()
    },
    initGrids() {
        var size = this.view.size
        let count = size.x * size.y * 2
        for (var j = 0; j < count; j += 2) {
            this.grids[j] = 0
            this.grids[j + 1] = 0
        }
        this.view.init(this.grids)
    },
    start() {
        //100               100
        //4.878564453125    -3.6517089843749915

    },
    update(dt) {},

    // BaseFloor 的 onTouch相关 函数 会返回一个list 
    // 第一个参数是对应的 格子的起始位置
    //第二个参数 则是对应的格子的 索引
    //第三个参数是为了应对 stretch 情况 设置的 ，需要给与之前的
    //zone 的信息（idx，size）
    onTouchStart(pos, size, for_zone_info = null) {
        this.selectZone.set(pos, size, for_zone_info)
        if (for_zone_info != null) {
            this.selectZone.clear(this.grids, true, 0, 0, true)
        }
        this.selectZone.select(this.grids, true, 255)
        var idx = this.selectZone.cur_zone.idx
        this.view.updateTex(this.grids)
        return [this.idx2pos(idx), idx, this.selectZone.cur_zone.construactable]
    },
    onTouch(pos, size) {
        this.selectZone.set(pos, size)
        this.selectZone.clear(this.grids, false, 0, 0)
        this.selectZone.select(this.grids, true, 255)
        var idx = this.selectZone.cur_zone.idx
        this.view.updateTex(this.grids)
        return [this.idx2pos(idx), idx, this.selectZone.cur_zone.construactable]
    },
    //第三个参数是为了应对 stretch 情况 设置的 ，需要给与stretch之前的
    //zone 的信息（idx，size）
    onTouchEnd(for_zone_info = null) {
        let construactable = this.selectZone.former_zone.construactable
        if (construactable) {
            this.selectZone.clear(this.grids, true, 0, 255)
        } else {
            if (for_zone_info == null)
                this.selectZone.clear(this.grids, true, 0, 0)
            else {
                this.selectZone.clear(this.grids, true, 0, 255)
            }
        }
        this.view.updateTex(this.grids)
        this.selectZone.reset()
        return construactable
    },
    // 恢复指定区域的状况
    resumeZone(pos, size) {
        this.selectZone.set(pos, size)
        this.selectZone.clear(this.grids, true, 0, 255)
        this.view.updateTex(this.grids)
        this.selectZone.reset()
    },
    pos2idx(pos) {
        let grid_idx = cc.Vec2.floor(cc.v2(pos.x / this.view.grid_radius, -pos.z / this.view.grid_radius))
        return grid_idx
    },
    idx2pos(idx) {
        let planner_vec = idx.mul(this.view.grid_radius)
        return cc.v3(planner_vec.x, 0, -planner_vec.y)
    },
    getGridSize() {
        return cc.Vec2.floor(this.view.size.div(this.view.grid_radius))
    },
    _setZone(idx, size, luminance, alpha) {
        var imgIdx = null
        var size = this.view.size
        let has_occupied = false
        for (let i = 0; i < size.x; i++) {
            let x = idx.x + i
            for (let j = 0; j < size.y; j++) {
                let y = idx.y - j
                var imgIdx = (size.x * y + x) * 2
                this.grids[imgIdx] = luminance
                this.grids[imgIdx + 1] = alpha
                this.view.updateTex(this.grids)
            }
        }
    },
});

var ZoneConstructor = cc.Class({
    __ctor__(baseFloor) {
        this.baseFloor = baseFloor
        this.former_zone = {
            pos: null,
            idx: null,
            size: null,
            construactable: false,
        }
        this.cur_zone = {
            pos: null,
            idx: null,
            size: null,
            construactable: false, // 选中区域是否可以进行建设
        }
    },
    set(pos, size, for_zone_info = null) {
        if (for_zone_info == null) {
            this.former_zone.pos = this.cur_zone.pos
            this.former_zone.idx = this.cur_zone.idx
            this.former_zone.size = this.cur_zone.size
            this.former_zone.construactable = this.cur_zone.construactable
        } else {
            this.former_zone.pos = for_zone_info.pos
            this.former_zone.idx = this.baseFloor.pos2idx(for_zone_info.pos)
            this.former_zone.size = for_zone_info.size
            this.former_zone.construactable = for_zone_info.construactable

        }
        this.cur_zone.pos = pos
        this.cur_zone.idx = this.baseFloor.pos2idx(pos)
        this.cur_zone.size = size
    },
    //zone 的两个域，
    //luminance 表示是否选中
    //alpha 表示是否占用
    //选定一个区域 如果 存在一个位置被占用 则将全部置红
    select(grids, cur_zone, luminance) {
        var zone = cur_zone ? this.cur_zone : this.former_zone
        var idx = zone.idx
        var size = zone.size
        var imgIdx = null
        zone.construactable = true
        let idxs = []
        for (let i = 0; i < Math.abs(size.x); i++) {
            let x = size.x >= 0 ? idx.x + i : idx.x - i - 1
            for (let j = 0; j < Math.abs(size.y); j++) {
                let y = size.y >= 0 ? idx.y + j : idx.y - j - 1
                var imgIdx = (this.baseFloor.view.size.x * y + x) * 2
                idxs.push(imgIdx)
                grids[imgIdx] = luminance
                if (grids[imgIdx + 1] == 255) { //存在被占用的点
                    zone.construactable = false
                }
            }
        }
        if (!zone.construactable) {
            for (const idx of idxs) {
                if (grids[idx + 1] != 255) {
                    grids[idx + 1] = 254 //使用 254 表示被选中但是未被占用
                }
            }
        }
    },
    //清空一个区域（即借宿选定的时候进行清空）
    //但是 不把 255状态（已经被占用的情况）给清空
    //force 强制清空所有内容
    clear(grids, cur_zone, luminance, alpha, force = false) {
        var zone = cur_zone ? this.cur_zone : this.former_zone
        var idx = zone.idx
        var size = zone.size
        var imgIdx = null

        for (let i = 0; i < Math.abs(size.x); i++) {
            let x = size.x >= 0 ? idx.x + i : idx.x - i - 1
            for (let j = 0; j < Math.abs(size.y); j++) {
                let y = size.y >= 0 ? idx.y + j : idx.y - j - 1
                var imgIdx = (this.baseFloor.view.size.x * y + x) * 2
                grids[imgIdx] = luminance
                if (force || grids[imgIdx + 1] != 255)
                    grids[imgIdx + 1] = alpha
            }
        }
    },
    reset() {
        this.former_zone.pos = null
        this.former_zone.idx = null
        this.former_zone.size = null
        this.cur_zone.pos = null
        this.cur_zone.idx = null
        this.cur_zone.size = null
    }

})