var BaseFloor = require("BaseFloor")
var Infrastructure = require("Infrastructure")
var MaxZIndex = cc.macro.MAX_ZINDEX
var MinZIndex = cc.macro.MIN_ZINDEX


var MetroBuilderView = cc.Class({
    name: "MetroBuilderView",
    properties: {
        wonder_speed: 1.2,
    },
    init(mbm) {
        this.mbm = mbm
        this.size = null // 整张布置地图的大小
        this.depth_map = null // 深度数据图
        this.camera = null
        this.canvas = null // cocos 中的 canvas 物体
            //this.game_canvas_size = null // gamecanvas 的size
            // this._camera_root = new cc.Vec2()
        this._camera_root_pos = new cc.Vec3()
        this._for_touch_pos = null
        this.size = mbm.basefloor.size
        this.camera = cc.Camera.main
        this.camera_root = this.camera.node
        this.ray = this.camera.getRay(cc.Vec2.ZERO) //相机的射线
        this.camera_forward = this.ray.d //获取相机的 视角方向向量

        // 设置mbm字段
        mbm.camera_forward = this.camera_forward

        // 功能相关
        this.blocked_infras = []
    },
    getOffsetPos(pos) { //接收屏幕中的相对位置 返回 绝对位置
        return pos.div(this.camera.zoomRatio).add(this.camera_abs_lb)
    },
    //事件回调
    onPlace(infras) {
        // this.depth_map 
    },

    // 视角移动的时候被调用
    onViewTouchStart(floor_pos) {
        this._for_touch_pos = floor_pos
    },
    onViewTouch(floor_pos) {
        var view_move_dir = floor_pos.sub(this._for_touch_pos).mul(this.wonder_speed)
        let camera_root_pos = this.getCamWolrdPos()
        let cam_new_pos = camera_root_pos.lerp(camera_root_pos.sub(cc.v3(view_move_dir.x, 0.0, view_move_dir.z)), 0.8)
        let cam_move_dir = cam_new_pos.sub(camera_root_pos)
        this.setCamWolrdPos(cam_new_pos)
        this._for_touch_pos = floor_pos.add(cam_move_dir); //重新计算 相机位移后的 touch_pos 的绝对位置
    },
    onBuildTouch() {
        let infras = this.mbm.cur_elem
        this.blocked_infras = this._xRayInfras(this.mbm.basefloor, infras)
        for (let i = 0; i < this.blocked_infras.length; i++) {
            let block_infras = this.blocked_infras[i].getComponent(Infrastructure)
            let overlap = this._isOverlap(infras.idx, infras.size, block_infras.idx, block_infras.size)
            block_infras.block(overlap)
        }
    },
    onBuildTouchEnd() {
        for (let i = 0; i < this.blocked_infras.length; i++) {
            const infras = this.blocked_infras[i].getComponent(Infrastructure);
            infras.resumeView()
        }
        this.blocked_infras.length = 0
    },
    //manager 调用函数
    getTouchInfo(pos, groups) {
        let touch_world_pos = this.camera.getScreenToWorldPoint(pos)
        let ray = cc.geomUtils.Ray.set(this.ray, touch_world_pos.x, touch_world_pos.y, touch_world_pos.z,
            this.camera_forward.x, this.camera_forward.y, this.camera_forward.z)
        if (groups != null)
            groups.push("BaseFloor")
        let results = cc.geomUtils.intersect.raycast(cc.director.getScene(), ray, null, groups != null ? this._rayGroupFilter(groups) : this._rayGroupFilter(["BaseFloor"]));

        let closetest_dist = null
        let closetest = null
        let floor_pos = null
        let ui_touched = false;
        for (let i = 0; i < results.length; i++) {
            let result = results[i]
            if (result.node.group == "BaseFloor") {
                floor_pos = this._screenPoint2HitPoint(ray, result)
            } else if (result.node.group == "Infras_UI") {
                closetest = result
                ui_touched = true;
                break;
            } else if (closetest_dist == null || results[i].distance < closetest_dist) {
                closetest = results[i]
            }
        }
        return { touch_node: closetest == null ? null : closetest.node, floor_pos: floor_pos, ui_touched: ui_touched }
    },
    //私有函数

    // 透视遮挡物
    _xRayInfras(basefloor, cur_infras) {
        // 设置 遮挡透明
        let block_infras = this._getBlockInfras(basefloor, cur_infras);
        let last_block_infras = this.blocked_infras
        for (let i = 0; i < last_block_infras.length; i++) {
            let infras = last_block_infras[i].getComponent(Infrastructure)
            if (block_infras.indexOf(infras.node) == -1) {
                infras.resumeView()
            }
        }

        return block_infras
    },
    // 获取 遮挡指定的 infras 的所有 infras 结点
    _getBlockInfras(basefloor, infras) {
        let size = infras.size
        let idx = infras.idx
            // 该算法只是 检测 边缘的 方格的 idx 并 发射射线
        let block_infras = []
        let cur_idx = cc.v2()
        let filter = this._composFilter([this._rayGroupFilter(["Infras"]), this._notInFilter(block_infras)])
            // 将 不存在 a中的 并且 不是 curelement 的项目加入a中
        let cat_unique = (a, b) => {
            for (let i = 0; i < b.length; i++) {
                const result = b[i];
                let r_node = result.node.parent // 碰到的 是 mesh 孩子结点
                if (r_node != infras.node && a.indexOf(r_node) == -1) {
                    a.push(r_node)
                }
            }
        }
        for (let i = 0; i < size.x; i++) {
            cur_idx.x = idx.x + i
            cur_idx.y = idx.y
            let pos = basefloor.idx2pos(cur_idx)
            cat_unique(block_infras, this._cameraRayCast(pos, filter))
        }
        for (let i = 1; i < size.y - 1; i++) {
            cur_idx.x = idx.x
            cur_idx.y = idx.y + i
            let pos = basefloor.idx2pos(cur_idx)
            cat_unique(block_infras, this._cameraRayCast(pos, filter))
        }
        return block_infras
    },
    // 通过 tar_pos 来指定 射线的 终点位置
    _cameraRayCast(tar_pos, filter) {
        //设置 距离为 1000.0
        let org_pos = tar_pos.sub(this.camera_forward.mul(1000.0))
        let ray = new cc.geomUtils.Ray()
        cc.geomUtils.Ray.fromPoints(ray, org_pos, tar_pos)
        let results = cc.geomUtils.intersect.raycast(cc.director.getScene(), ray, null, filter);
        return results
    },
    _screenPoint2HitPoint(ray, result) {
        let dist = result.distance
        return ray.o.add(ray.d.mul(dist))
    },
    //// ray cast 的 filters
    //
    _rayGroupFilter(check_groups) {
        return function(node) {
            let idx = check_groups.indexOf(node.group)
            if (idx == -1) {
                return false
            }
            return true
        }
    },
    // 不存在指定的容器中
    _notInFilter(nodes) {
        return (node) => {
            let idx = nodes.indexOf(node)
            if (idx == -1) {
                return true
            }
            return false
        }
    },
    // 组合filter 按序 进行 filter 检查
    _composFilter(filters) {
        return (node) => {
            for (let i = 0; i < filters.length; i++) {
                if (filters[i](node)) {
                    continue
                } else {
                    return false
                }
            }
            return true
        }
    },
    _isOverlap(idxA, sizeA, idxB, sizeB) { //判断两个rect 是否有相交的区域
        const startXA = idxA.x,
            startYA = idxA.y,
            endXA = startXA + sizeA.x,
            endYA = startYA + sizeA.y;

        const startXB = idxB.x,
            startYB = idxB.y,
            endXB = startXB + sizeB.x,
            endYB = startYB + sizeB.y;

        // 计算 非相交的 坐标情况
        return !(endYB <= startYA || endYA <= startYB || startXA >= endXB || startXB >= endXA)
    },

    // getter setter
    getCamWolrdPos() {
        this.camera_root.getPosition(this._camera_root_pos)
        return this._camera_root_pos
    },
    setCamWolrdPos(value) {
        this.camera_root.setPosition(value)
    },


})

var BuildMode = { // 构建页面下的模式
    Build: "build", // 构建设施
    View: "view", //查看视图
    //对于可调整大小的设施  有额外的 stretch模式, 
    // 只可能在 build 模式下进入
    Stretch: "adjust",

}

cc.Class({
    extends: require('BaseManager'),
    statics: {
        BuildMode: BuildMode
    },
    properties: {
        basefloor: {
            type: BaseFloor,
            default: null,
        },
        cur_elem_prefab: {
            type: cc.Prefab,
            default: null,
        },
        elem_root: {
            type: cc.Node,
            default: null,
        },
        elem_list: {
            type: [cc.Prefab],
            default: [],
        },
        metro_prefabs: {
            type: [cc.Prefab],
            default: [],
        },
        view: {
            type: MetroBuilderView,
            default: null,
        },
        cur_elem: {
            get() {
                return this._cur_elem
            },
            set(value) {
                this.gameMng.setSelectFocus(value)
                this._cur_elem = value
            },
            visible: false,
        },
        mode: {
            visible: false,
            get() {
                return this._mode
            },
            set(value) {
                if (value != this._mode && this.gameMng != null) {
                    this.gameMng.uiMng.onModeChange(value)
                }
                this._mode = value
            }
        }
    },
    ctor() {
        this._cur_elem = null
        this.cur_UIelem = null
        this._mode = null
        this.view = new MetroBuilderView(this)
        this.blocked_infras = [] // 所有 阻挡当前elem 的 infras 的实例
        this.offset_vec = null // 选择的时候的 触摸位置和 源点位置的offset
    },
    initManager(gameMng) {
        this._super(gameMng)
        this.view.init(this)
        this._initEvents()
        Infrastructure.MetroMng = this
    },
    _initEvents() {
        // 全局事件监听
        this.gameMng.listenToInput("touch_start", this.onTouchStart, this)
        this.gameMng.listenToInput("on_touch", this.onTouch, this)
        this.gameMng.listenToInput("touch_end", this.onTouchEnd, this)
        this.gameMng.listenToInput("touch_cancle", this.onTouchEnd, this)
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this)
    },
    onTouchStart(event) {
        var pos = event.getLocation();
        let touch_info = this.view.getTouchInfo(pos, ["Infras", "Infras_UI"])
        if (touch_info.ui_touched == true && this.mode == BuildMode.Build) {
            this.mode = BuildMode.Stretch
        }
        switch (this.mode) {
            case BuildMode.Build:
                this.onBuildTouchStart(touch_info)
                break;
            case BuildMode.View:
                this.onViewTouchStart(touch_info.floor_pos)
                break;
            case BuildMode.Stretch:
                this.onStretchTouchStart(touch_info)
                break;
        }
    },
    onTouch(event) {
        var pos = event.getLocation();
        let touch_info = this.view.getTouchInfo(pos)
        switch (this.mode) {
            case BuildMode.Build:
                this.onBuildTouch(touch_info)
                break;
            case BuildMode.View:
                this.onViewTouch(touch_info.floor_pos)
                break;
            case BuildMode.Stretch:
                this.onStretchTouch(touch_info)
                break;

        }

    },
    onTouchEnd(event) {
        var pos = event.getLocation();
        let touch_info = this.view.getTouchInfo(pos)
        switch (this.mode) {
            case BuildMode.Build:
                this.onBuildTouchEnd(touch_info)
                break;
            case BuildMode.View:
                this.onViewTouchEnd(touch_info.floor_pos)
                break;
            case BuildMode.Stretch:
                this.onStretchTouchEnd(touch_info)
                break;

        }
    },

    selectInfrasPrefab(list_idx) {
        this.cur_elem_prefab = this.elem_list[list_idx]
    },
    //事件回调
    onStretchTouchStart(touch_info) {
        if (touch_info.touch_node == null) {
            this.mode = BuildMode.Build
            return;
        }
        this.cur_UIelem = touch_info.touch_node.getComponent("UIComponentBase")
        this.cur_UIelem.onTouchEnter()
        let infras = this.cur_UIelem.infras
        let org_pos = infras.node.getPosition()
        let for_zone_info = {
            pos: org_pos,
            size: infras.size,
            construactable: true,
        }
        let elem_pos_info = this.basefloor.onTouchStart(this.basefloor.idx2pos(infras.idx), infras.size, for_zone_info)
    },
    onStretchTouch(touch_info) {
        let end_idx = this.basefloor.pos2idx(touch_info.floor_pos)
        let infras = this.cur_UIelem.infras
        let size = end_idx.sub(infras.idx)
        let elem_pos_info = this.basefloor.onTouch(this.basefloor.idx2pos(infras.idx), size)
        this.cur_UIelem.onTouch(size, elem_pos_info[2])

    },
    onStretchTouchEnd(touch_info) {
        let constructable = this.basefloor.onTouchEnd()
        if (!this.cur_elem.isConstructable()) {
            constructable = false
        }
        this.cur_UIelem.onTouchEnd(constructable)
        if (constructable) {
            this._dispatchInfrasEvent("base_change")
        }
        this.mode = BuildMode.Build
        this.cur_UIelem = null

    },
    onBuildTouchStart(touch_info) {
        if (touch_info.touch_node != null) {
            let new_elem = touch_info.touch_node.parent.getComponent(Infrastructure)
            if (this.cur_elem != new_elem) {
                this.cur_elem.onSelectExit()
                this.cur_elem = new_elem
                this.cur_elem.onSelectEnter()
            }
            let org_pos = this.cur_elem.node.getPosition()
            this.offset_vec = org_pos.sub(touch_info.floor_pos)
            let size = this.cur_elem.size
            let for_zone_info = {
                pos: org_pos,
                size: size,
                construactable: true,
            }
            let origin_pos = touch_info.floor_pos.add(this.offset_vec)
            let transformed_idx = this.cur_elem.transformIdx(this.pos2idx(origin_pos))
            let elem_pos_info = this.basefloor.onTouchStart(this.idx2pos(transformed_idx), size, for_zone_info)
                //let elem_pos_info = this.basefloor.onTouchStart(origin_pos, size, for_zone_info)
            this.cur_elem.move(elem_pos_info)
                //this.cur_elem.node.setPosition(elem_pos[0])

        } else if (this.cur_elem_prefab != null) {
            if (this.cur_elem != null) this.cur_elem.onSelectExit()
            this.cur_elem = cc.instantiate(this.cur_elem_prefab).getComponent(Infrastructure)
            this.cur_elem.start()
            this.cur_elem.node.parent = this.elem_root
            this.cur_elem.onSelectEnter()
            let size = this.cur_elem.size
            this.offset_vec = cc.Vec2.ZERO
            let transformed_idx = this.cur_elem.transformIdx(this.pos2idx(touch_info.floor_pos))
            let elem_pos_info = this.basefloor.onTouchStart(this.idx2pos(transformed_idx), size)
                //let elem_pos_info = this.basefloor.onTouchStart(touch_info.floor_pos, size)
            this.cur_elem.move(elem_pos_info)
                //this.cur_elem.node.setPosition(elem_pos[0])
        }
        // else { //只是查看建筑
        //     let touch_infras = touch_info.touch_node.parent.getComponent(Infrastructure)
        //     if (touch_infras != null && touch_infras != this.cur_elem) {
        //         if (this.cur_elem != null)
        //             this.cur_elem.onSelectExit()
        //         this.cur_elem = touch_infras
        //         this.cur_elem.onSelectEnter()
        //     }
        // }
    },
    onBuildTouch(touch_info) {
        let size = this.cur_elem.size
        let transformed_idx = this.cur_elem.transformIdx(this.pos2idx(touch_info.floor_pos.add(this.offset_vec)))
        let elem_pos_info = this.basefloor.onTouch(this.idx2pos(transformed_idx), size)
            //let elem_pos_info = this.basefloor.onTouch(touch_info.floor_pos.add(this.offset_vec), size)
        this.cur_elem.move(elem_pos_info)
        this.cur_elem.onSelect(elem_pos_info[2])
        this.view.onBuildTouch()
    },
    onBuildTouchEnd(touch_info) {
        //baseFloor.onTouchEnd 将会 返回该位置是否 constructable
        let constructable = this.basefloor.onTouchEnd()
        if (constructable) {
            this.cur_elem.place()
            this.view.onPlace(this.cur_elem)
            this._dispatchInfrasEvent("base_change")
        } else {
            let destroyed = this.cur_elem.onPlaceFail()
                // this.cur_elem.node.destroy()
            if (destroyed) this.cur_elem = null
            else {
                this.cur_elem.onSelectEnter()
                this.basefloor.resumeZone(this.cur_elem.node.getPosition(), this.cur_elem.size)
            }
        }
        this.view.onBuildTouchEnd()
    },
    onViewTouchStart(pos) {
        this.view.onViewTouchStart(pos)
    },
    onViewTouch(pos) {
        this.view.onViewTouch(pos, this.cur_elem)
    },
    onViewTouchEnd(pos) {

    },

    // 调用
    getBesideFloors(track_infras) {
        let floors = this.elem_root.getComponentsInChildren("FloorInfras")
        var x = track_infras.dir ? track_infras.idx.x - 1 : track_infras.idx.x + track_infras.size.x
        let result_floors = new Array()
        for (let i = 0; i < floors.length; i++) {
            const floor = floors[i];
            let bounding = floor.getBounding()
            let bound_x = 0
            if (track_infras.dir) {
                bound_x = bounding.xMax
            } else {
                bound_x = bounding.xMin
            }
            if (bound_x == x) {
                result_floors.push(floor)
            }
        }
        if (result_floors.length != 0) {
            result_floors.sort((a, b) => {
                let boudning_a = a.getBounding()
                let boudning_b = b.getBounding()
                if (boudning_a.yMin == boudning_b.yMin) {
                    return 0
                } else if (boudning_a.yMin <= boudning_b.yMin) {
                    return -1
                } else {
                    return 1
                }
            })
        }
        return result_floors
    },
    // 调用转发
    // pos2ModifiedUvByMap(pos) {
    //     return this.basefloor.pos2ModifiedUvByMap(pos)
    // },
    idx2pos(idx) {
        return this.basefloor.idx2pos(idx)
    },
    pos2idx(pos) {
        return this.basefloor.pos2idx(pos)
    },
    getFloorGridSize() {
        return this.basefloor.getGridSize()
    },
    // 私有函数
    _dispatchInfrasEvent(event, args) {
        let infras = this.elem_root.getComponentsInChildren("Infrastructure")
        for (const infra of infras) {
            infra.node.emit(event, args)
        }
    }


})