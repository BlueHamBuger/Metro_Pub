// Learn cc.Class:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/class.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://docs.cocos2d-x.org/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] https://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html


var InfrasView = cc.Class({
    name: "InfrasView",
    statics: {
        materials: {},
        getViewType(infras) {
            return infras.node.name
        },
        isLoaded(infras) {
            return InfrasView.materials[InfrasView.getViewType(infras)] != null
        }
    },
    //pixel_origin 指的是图像的原点在 裁剪后的 spriteFrame 中的位置
    __ctor__(infras) { //设置好 被选 material
        var mesh = infras.node.getChildByName("mesh")
        this.mesh_renderer = mesh.getComponent(cc.MeshRenderer)
        this.type = InfrasView.getViewType(infras)
        this.infras_node = infras.node
        if (!InfrasView.isLoaded(infras)) {
            //TODO 将贴图合并成一张雪碧图
            var norm_mat = this.mesh_renderer.sharedMaterials[0]
            var diff_tex = norm_mat.getProperty("texture")
            var gameMng = Infrastructure.MetroMng.gameMng
            var select_mat = cc.Material.getNewInstance(gameMng.getMaterial("infras_select"), infras.node)
            select_mat.setProperty("texture", diff_tex)
            select_mat.setProperty("construcable", 1.0)
            select_mat._owner = null // 设置为 null 让getNewInstance 可以复制出一个新的 material
            var select_overlap_mat = cc.Material.getNewInstance(select_mat, infras.node)
            select_overlap_mat.setProperty("construcable", 0.0)


            var block_mat = cc.Material.getNewInstance(gameMng.getMaterial("infras_block"), infras.node)
            block_mat.setProperty("texture", diff_tex)
            block_mat.setProperty("construcable", 1.0)
            block_mat._owner = null

            var block_overlap_mat = cc.Material.getNewInstance(block_mat, infras.node)
            block_overlap_mat.setProperty("construcable", 0.0)

            InfrasView.materials[this.type] = {
                normal: norm_mat,
                select: select_mat,
                block: block_mat,
                select_overlap: select_overlap_mat,
                block_overlap: block_overlap_mat,
            }
            this.mesh_renderer.setMaterial(0, InfrasView.materials[this.type].normal)
        } else {
            this.mesh_renderer.setMaterial(0, InfrasView.materials[this.type].normal)
        }
    },
    onPlace() {},
    onSelect(construactable) {
        let select_mat = construactable == true ? InfrasView.materials[this.type].select : InfrasView.materials[this.type].select_overlap
        if (this.mesh_renderer.getMaterial(0) != select_mat)
            this.mesh_renderer.setMaterial(0, select_mat)
    },
    onMove() {},
    onBlock(overlap) {
        let block_mat = overlap == false ? InfrasView.materials[this.type].block : InfrasView.materials[this.type].block_overlap
        if (this.mesh_renderer.getMaterial(0) != block_mat)
            this.mesh_renderer.setMaterial(0, block_mat)
    },
    onResume() {
        let norm_mat = InfrasView.materials[this.type].normal
        if (this.mesh_renderer.getMaterial(0) != norm_mat)
            this.mesh_renderer.setMaterial(0, norm_mat)
    },
})
var InfrasTypes = cc.Enum({
    Floor: 0,
    Metro: 1,
    Track: 2
})
var Infrastructure = cc.Class({
    extends: cc.Component,
    statics: {
        MetroMng: null,
        InfrasView: InfrasView,
        getType(infras) { // 返回 该设施的类型
            // var mesh = infras.node.getChildByName("mesh")
            // var mesh_renderer = mesh.getComponent(cc.MeshRenderer)
            // console.log(mesh_renderer);
            return infras.node.name;
        },
        InfrasTypes: InfrasTypes

    },
    properties: {
        size: cc.v2(0, 0),
        idx: {
            default: cc.v2(),
            visible: false,
        },
        type: {
            type: InfrasTypes,
            default: null
        },
        interactable: true,
        cost: 0,
        icon: {
            type: cc.SpriteFrame,
            default: null
        }

    },
    ctor() {
        //this.texture = this.get
        this.type = null
        this.view = null
            // 未被初始化过
        this._cur_pos = null;
    },
    start(InfrasViewClass = null) { // 有时候 需要创建后立刻使用，故start可以被外部调用
        if (this.view == null) { //表示是否被初始化过
            //this.type = Infrastructure.getType(this)
            if (InfrasViewClass == null) {
                this.view = new InfrasView(this)
            } else {
                this.view = new InfrasViewClass(this)
            }
        }
        this.node.on("base_change", this.onBaseFloorChange, this)
    },
    // 在 绘制 basefloor 之前进行一次transform 操作
    // 对于特殊的 infras 进行使用
    transformIdx(idx) {
        return idx
    },
    onSelectEnter() {
        this.view.onSelect(true)
    },
    onSelect(construactable) {
        this.view.onSelect(construactable)
    },
    onSelectExit() {
        this.view.onResume()
    },
    onBaseFloorChange() { // 当设施布局发生变化

    },
    // LIFE-CYCLE CALLBACKS:
    // elem_pos_info 为一个数组
    //      第一个元素指定的是 位置
    //      第二个表示在grid 中的索引位置
    move(elem_pos_info) { //移动设备
        this.view.onMove()
        this.node.setPosition(elem_pos_info[0])
        this.idx = elem_pos_info[1] // 
    },
    place() { // 放置设备
        this.view.onPlace()
        this.node.opacity = 255
        if (this._cur_pos == null) { //未建造
            Infrastructure.MetroMng.gameMng.spendCoin(this.getCost())
        } else { // 只是移动 收取十分之一费用
            if (!this._cur_pos.equals(this.node.getPosition()))
                Infrastructure.MetroMng.gameMng.spendCoin(Math.ceil(this.getCost() / 10))
        }
        this._cur_pos = this.node.getPosition()
        return true
    },

    getCost() {
        return this.cost
    },
    // 被销毁 则返回 true 否则为 false
    onPlaceFail() {
        // 该infras 未被创建
        if (this._cur_pos == null) {
            this.node.destroy()
            return true
        } else {
            // 设置为原来的位置
            this.node.setPosition(this._cur_pos)
            return false
        }
    },
    block(construcable) {
        this.view.onBlock(construcable)
    },
    resumeView() {
        this.view.onResume(this)
    },
    // 状态回调
    getView() {
        return this.view
    },
    isConstructable() {
        return true
    },
    getBounding() {
        let y = this.size.y > 0 ? this.idx.y : this.idx.y + this.size.y
        let x = this.size.x > 0 ? this.idx.x : this.idx.x + this.size.x
        return cc.rect(x, y, Math.abs(this.size.x) - 1, Math.abs(this.size.y) - 1)
    }


});