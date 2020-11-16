class RootInterpreter {
    evaluate(node, input, args) {
        return (context) => {
            return "SUCCESS! " + node.name;
        };
    }
}

function getGrammarTags() {
    return ['Root', 'xxxxx'];
}
function getInterpreter(grammarTag) {
    if ('Root' === grammarTag) {
        return new RootInterpreter();
    }
    return null;
}
function getTokenType(node) {
    const { name, isError } = node;
    if (isError) {
        return 'error';
    }
    if (name === 'FunctionDefinition') {
        return 'builtin';
    }
    return 'name';
}
const getEditorInfo = () => {
    return {
        getGrammarTags, getInterpreter, getTokenType
    };
};

/// The default maximum length of a `TreeBuffer` node.
var DefaultBufferLength = 1024;
var nextPropID = 0;
var CachedNode = new WeakMap();
/// Each [node type](#tree.NodeType) can have metadata associated with
/// it in props. Instances of this class represent prop names.
var NodeProp = /** @class */ (function () {
    /// Create a new node prop type. You can optionally pass a
    /// `deserialize` function.
    function NodeProp(_a) {
        var deserialize = (_a === void 0 ? {} : _a).deserialize;
        this.id = nextPropID++;
        this.deserialize = deserialize || (function () {
            throw new Error("This node type doesn't define a deserialize function");
        });
    }
    /// Create a string-valued node prop whose deserialize function is
    /// the identity function.
    NodeProp.string = function () { return new NodeProp({ deserialize: function (str) { return str; } }); };
    /// Create a number-valued node prop whose deserialize function is
    /// just `Number`.
    NodeProp.number = function () { return new NodeProp({ deserialize: Number }); };
    /// Creates a boolean-valued node prop whose deserialize function
    /// returns true for any input.
    NodeProp.flag = function () { return new NodeProp({ deserialize: function () { return true; } }); };
    /// Store a value for this prop in the given object. This can be
    /// useful when building up a prop object to pass to the
    /// [`NodeType`](#tree.NodeType) constructor. Returns its first
    /// argument.
    NodeProp.prototype.set = function (propObj, value) {
        propObj[this.id] = value;
        return propObj;
    };
    /// This is meant to be used with
    /// [`NodeGroup.extend`](#tree.NodeGroup.extend) or
    /// [`Parser.withProps`](#lezer.Parser.withProps) to compute prop
    /// values for each node type in the group. Takes a [match
    /// object](#tree.NodeType^match) or function that returns undefined
    /// if the node type doesn't get this prop, and the prop's value if
    /// it does.
    NodeProp.prototype.add = function (match) {
        var _this = this;
        if (typeof match != "function")
            match = NodeType.match(match);
        return function (type) {
            var result = match(type);
            return result === undefined ? null : [_this, result];
        };
    };
    /// Prop that is used to describe matching delimiters. For opening
    /// delimiters, this holds an array of node names (written as a
    /// space-separated string when declaring this prop in a grammar)
    /// for the node types of closing delimiters that match it.
    NodeProp.closedBy = new NodeProp({ deserialize: function (str) { return str.split(" "); } });
    /// The inverse of [`openedBy`](#tree.NodeProp^closedBy). This is
    /// attached to closing delimiters, holding an array of node names
    /// of types of matching opening delimiters.
    NodeProp.openedBy = new NodeProp({ deserialize: function (str) { return str.split(" "); } });
    /// Used to assign node types to groups (for example, all node
    /// types that represent an expression could be tagged with an
    /// `"Expression"` group).
    NodeProp.group = new NodeProp({ deserialize: function (str) { return str.split(" "); } });
    return NodeProp;
}());
/// Each node in a syntax tree has a node type associated with it.
var NodeType = /** @class */ (function () {
    /// @internal
    function NodeType(
    /// The name of the node type. Not necessarily unique, but if the
    /// grammar was written properly, different node types with the
    /// same name within a node group should play the same semantic
    /// role.
    name, 
    /// @internal
    props, 
    /// The id of this node in its group. Corresponds to the term ids
    /// used in the parser.
    id, 
    /// @internal
    flags) {
        if (flags === void 0) { flags = 0; }
        this.name = name;
        this.props = props;
        this.id = id;
        this.flags = flags;
    }
    /// Retrieves a node prop for this type. Will return `undefined` if
    /// the prop isn't present on this node.
    NodeType.prototype.prop = function (prop) { return this.props[prop.id]; };
    Object.defineProperty(NodeType.prototype, "isTop", {
        /// True when this is the top node of a grammar.
        get: function () { return (this.flags & 1) > 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeType.prototype, "isSkipped", {
        /// True when this node is produced by a skip rule.
        get: function () { return (this.flags & 2) > 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeType.prototype, "isError", {
        /// Indicates whether this is an error node.
        get: function () { return (this.flags & 4) > 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeType.prototype, "isRepeated", {
        /// When true, this node type is used to cache repetition, and is
        /// not a user-defined named node.
        get: function () { return (this.flags & 8) > 0; },
        enumerable: true,
        configurable: true
    });
    /// Returns true when this node's name or one of its
    /// [groups](#tree.NodeProp^group) matches the given string.
    NodeType.prototype.is = function (name) {
        if (this.name == name)
            return true;
        var group = this.prop(NodeProp.group);
        return group ? group.indexOf(name) > -1 : false;
    };
    /// Create a function from node types to arbitrary values by
    /// specifying an object whose property names are node or
    /// [group](#tree.NodeProp^group) names. Often useful with
    /// [`NodeProp.add`](#tree.NodeProp.add). You can put multiple
    /// names, separated by spaces, in a single property name to map
    /// multiple node names to a single value.
    NodeType.match = function (map) {
        var direct = Object.create(null);
        for (var prop in map)
            for (var _i = 0, _a = prop.split(" "); _i < _a.length; _i++) {
                var name = _a[_i];
                direct[name] = map[prop];
            }
        return function (node) {
            for (var groups = node.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
                var found = direct[i < 0 ? node.name : groups[i]];
                if (found)
                    return found;
            }
        };
    };
    /// An empty dummy node type to use when no actual type is available.
    NodeType.none = new NodeType("", Object.create(null), 0);
    return NodeType;
}());
/// A node group holds a collection of node types. It is used to
/// compactly represent trees by storing their type ids, rather than a
/// full pointer to the type object, in a number array. Each parser
/// [has](#lezer.Parser.group) a node group, and [tree
/// buffers](#tree.TreeBuffer) can only store collections of nodes
/// from the same group. A group can have a maximum of 2**16 (65536)
/// node types in it, so that the ids fit into 16-bit typed array
/// slots.
var NodeGroup = /** @class */ (function () {
    /// Create a group with the given types. The `id` property of each
    /// type should correspond to its position within the array.
    function NodeGroup(
    /// The node types in this group, by id.
    types) {
        this.types = types;
        for (var i = 0; i < types.length; i++)
            if (types[i].id != i)
                throw new RangeError("Node type ids should correspond to array positions when creating a node group");
    }
    /// Create a copy of this group with some node properties added. The
    /// arguments to this method should be created with
    /// [`NodeProp.add`](#tree.NodeProp.add).
    NodeGroup.prototype.extend = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        var newTypes = [];
        for (var _a = 0, _b = this.types; _a < _b.length; _a++) {
            var type = _b[_a];
            var newProps = null;
            for (var _c = 0, props_1 = props; _c < props_1.length; _c++) {
                var source = props_1[_c];
                var add = source(type);
                if (add) {
                    if (!newProps)
                        newProps = Object.assign({}, type.props);
                    add[0].set(newProps, add[1]);
                }
            }
            newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
        }
        return new NodeGroup(newTypes);
    };
    return NodeGroup;
}());
/// A piece of syntax tree. There are two ways to approach these
/// trees: the way they are actually stored in memory, and the
/// convenient way.
///
/// Syntax trees are stored as a tree of `Tree` and `TreeBuffer`
/// objects. By packing detail information into `TreeBuffer` leaf
/// nodes, the representation is made a lot more memory-efficient.
///
/// However, when you want to actually work with tree nodes, this
/// representation is very awkward, so most client code will want to
/// use the `TreeCursor` interface instead, which provides a view on
/// some part of this data structure, and can be used to move around
/// to adjacent nodes.
var Tree = /** @class */ (function () {
    /// Construct a new tree. You usually want to go through
    /// [`Tree.build`](#tree.Tree^build) instead.
    function Tree(type, 
    /// The tree's child nodes. Children small enough to fit in a
    /// `TreeBuffer will be represented as such, other children can be
    /// further `Tree` instances with their own internal structure.
    children, 
    /// The positions (offsets relative to the start of this tree) of
    /// the children.
    positions, 
    /// The total length of this tree
    length) {
        this.type = type;
        this.children = children;
        this.positions = positions;
        this.length = length;
    }
    /// @internal
    Tree.prototype.toString = function () {
        var children = this.children.map(function (c) { return c.toString(); }).join();
        return !this.type.name ? children :
            (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) +
                (children.length ? "(" + children + ")" : "");
    };
    Tree.prototype.partial = function (start, end, offset, children, positions) {
        for (var i = 0; i < this.children.length; i++) {
            var from = this.positions[i];
            if (from > end)
                break;
            var child = this.children[i], to = from + child.length;
            if (to < start)
                continue;
            if (start <= from && end >= to) {
                children.push(child);
                positions.push(from + offset);
            }
            else if (child instanceof Tree) {
                child.partial(start - from, end - from, offset + from, children, positions);
            }
        }
    };
    /// Apply a set of edits to a tree, removing all nodes that were
    /// touched by the edits, and moving remaining nodes so that their
    /// positions are updated for insertions/deletions before them. This
    /// is likely to destroy a lot of the structure of the tree, and
    /// mostly useful for extracting the nodes that can be reused in a
    /// subsequent incremental re-parse.
    Tree.prototype.applyChanges = function (changes) {
        if (changes.length == 0)
            return this;
        var children = [], positions = [];
        function cutAt(tree, pos, side) {
            var cursor = tree.cursor(pos, -side);
            for (;;) {
                if (!cursor.enter(side, pos))
                    for (;;) {
                        if ((side < 0 ? cursor.to <= pos : cursor.from >= pos) && !cursor.type.isError)
                            return side < 0 ? Math.min(pos, cursor.to - 1) : Math.max(pos, cursor.from + 1);
                        if (cursor.sibling(side))
                            break;
                        if (!cursor.parent())
                            return side < 0 ? 0 : tree.length;
                    }
            }
        }
        var off = 0;
        for (var i = 0, pos = 0;; i++) {
            var next = i == changes.length ? null : changes[i];
            var nextPos = next ? cutAt(this, next.fromA, -1) : this.length;
            if (nextPos > pos)
                this.partial(pos, nextPos, off, children, positions);
            if (!next)
                break;
            pos = cutAt(this, next.toA, 1);
            off += (next.toB - next.fromB) - (next.toA - next.fromA);
        }
        return new Tree(NodeType.none, children, positions, this.length + off);
    };
    /// Take the part of the tree up to the given position.
    Tree.prototype.cut = function (at) {
        if (at >= this.length)
            return this;
        var children = [], positions = [];
        for (var i = 0; i < this.children.length; i++) {
            var from = this.positions[i];
            if (from >= at)
                break;
            var child = this.children[i], to = from + child.length;
            children.push(to <= at ? child : child.cut(at - from));
            positions.push(from);
        }
        return new Tree(this.type, children, positions, at);
    };
    /// Get a [tree cursor](#tree.TreeCursor) rooted at this tree. When
    /// `pos` is given, the cursor is [moved](#tree.TreeCursor.moveTo)
    /// to the given position and side.
    Tree.prototype.cursor = function (pos, side) {
        if (side === void 0) { side = 0; }
        var scope = (pos != null && CachedNode.get(this)) || this.topNode;
        var cursor = new TreeCursor(scope);
        if (pos != null) {
            cursor.moveTo(pos, side);
            CachedNode.set(this, cursor.tree);
        }
        return cursor;
    };
    Object.defineProperty(Tree.prototype, "topNode", {
        /// Get a [syntax node](#tree.SyntaxNode) object for the top of the
        /// tree.
        get: function () {
            return new TreeNode(this, 0, 0, null);
        },
        enumerable: true,
        configurable: true
    });
    /// Get the [syntax node](#tree.SyntaxNode) at the given position.
    /// If `side` is -1, this will move into nodes that end at the
    /// position. If 1, it'll move into nodes that start at the
    /// position. With 0, it'll only enter nodes that cover the position
    /// from both sides.
    Tree.prototype.resolve = function (pos, side) {
        if (side === void 0) { side = 0; }
        return this.cursor(pos, side).node;
    };
    /// Iterate over the tree and its children, calling `enter` for any
    /// node that touches the `from`/`to` region (if given) before
    /// running over such a node's children, and `leave` (if given) when
    /// leaving the node. When `enter` returns `false`, the given node
    /// will not have its children iterated over (or `leave` called).
    Tree.prototype.iterate = function (spec) {
        var enter = spec.enter, leave = spec.leave, _a = spec.from, from = _a === void 0 ? 0 : _a, _b = spec.to, to = _b === void 0 ? this.length : _b;
        for (var c = this.cursor();;) {
            var mustLeave = false;
            if (c.from <= to && c.to >= from && (c.type.isRepeated || enter(c.type, c.from, c.to) !== false)) {
                if (c.firstChild())
                    continue;
                mustLeave = true;
            }
            for (;;) {
                if (mustLeave && leave)
                    leave(c.type, c.from, c.to);
                if (c.nextSibling())
                    break;
                if (!c.parent())
                    return;
                mustLeave = true;
            }
        }
    };
    /// Append another tree to this tree. `other` must have empty space
    /// big enough to fit this tree at its start.
    Tree.prototype.append = function (other) {
        if (!other.children.length)
            return this;
        if (other.positions[0] < this.length)
            throw new Error("Can't append overlapping trees");
        return new Tree(this.type, this.children.concat(other.children), this.positions.concat(other.positions), other.length);
    };
    /// Balance the direct children of this tree.
    Tree.prototype.balance = function (maxBufferLength) {
        if (maxBufferLength === void 0) { maxBufferLength = DefaultBufferLength; }
        return this.children.length <= BalanceBranchFactor ? this
            : balanceRange(this.type, NodeType.none, this.children, this.positions, 0, this.children.length, 0, maxBufferLength, this.length);
    };
    /// Build a tree from a postfix-ordered buffer of node information,
    /// or a cursor over such a buffer.
    Tree.build = function (data) { return buildTree(data); };
    /// The empty tree
    Tree.empty = new Tree(NodeType.none, [], [], 0);
    return Tree;
}());
/// Tree buffers contain (type, start, end, endIndex) quads for each
/// node. In such a buffer, nodes are stored in prefix order (parents
/// before children, with the endIndex of the parent indicating which
/// children belong to it)
var TreeBuffer = /** @class */ (function () {
    /// Create a tree buffer @internal
    function TreeBuffer(
    /// @internal
    buffer, 
    // The total length of the group of nodes in the buffer.
    length, 
    /// @internal
    group, type) {
        if (type === void 0) { type = NodeType.none; }
        this.buffer = buffer;
        this.length = length;
        this.group = group;
        this.type = type;
    }
    /// @internal
    TreeBuffer.prototype.toString = function () {
        var result = [];
        for (var index = 0; index < this.buffer.length;) {
            result.push(this.childString(index));
            index = this.buffer[index + 3];
        }
        return result.join(",");
    };
    /// @internal
    TreeBuffer.prototype.childString = function (index) {
        var id = this.buffer[index], endIndex = this.buffer[index + 3];
        var type = this.group.types[id], result = type.name;
        if (/\W/.test(result) && !type.isError)
            result = JSON.stringify(result);
        index += 4;
        if (endIndex == index)
            return result;
        var children = [];
        while (index < endIndex) {
            children.push(this.childString(index));
            index = this.buffer[index + 3];
        }
        return result + "(" + children.join(",") + ")";
    };
    /// @internal
    TreeBuffer.prototype.cut = function (at) {
        var cutPoint = 0;
        while (cutPoint < this.buffer.length && this.buffer[cutPoint + 1] < at)
            cutPoint += 4;
        var newBuffer = new Uint16Array(cutPoint);
        for (var i = 0; i < cutPoint; i += 4) {
            newBuffer[i] = this.buffer[i];
            newBuffer[i + 1] = this.buffer[i + 1];
            newBuffer[i + 2] = Math.min(at, this.buffer[i + 2]);
            newBuffer[i + 3] = Math.min(this.buffer[i + 3], cutPoint);
        }
        return new TreeBuffer(newBuffer, Math.min(at, this.length), this.group);
    };
    /// @internal
    TreeBuffer.prototype.findChild = function (startIndex, endIndex, dir, after) {
        var buffer = this.buffer, pick = -1;
        for (var i = startIndex; i != endIndex; i = buffer[i + 3]) {
            if (after != -100000000 /* None */) {
                var start = buffer[i + 1], end = buffer[i + 2];
                if (dir > 0) {
                    if (end > after)
                        pick = i;
                    if (end > after)
                        break;
                }
                else {
                    if (start < after)
                        pick = i;
                    if (end >= after)
                        break;
                }
            }
            else {
                pick = i;
                if (dir > 0)
                    break;
            }
        }
        return pick;
    };
    return TreeBuffer;
}());
var TreeNode = /** @class */ (function () {
    function TreeNode(node, from, index, _parent) {
        this.node = node;
        this.from = from;
        this.index = index;
        this._parent = _parent;
    }
    Object.defineProperty(TreeNode.prototype, "type", {
        get: function () { return this.node.type; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "name", {
        get: function () { return this.node.type.name; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "to", {
        get: function () { return this.from + this.node.length; },
        enumerable: true,
        configurable: true
    });
    TreeNode.prototype.nextChild = function (i, dir, after) {
        for (var parent = this;;) {
            for (var _a = parent.node, children = _a.children, positions = _a.positions, e = dir > 0 ? children.length : -1; i != e; i += dir) {
                var next = children[i], start = positions[i] + parent.from;
                if (after != -100000000 /* None */ && (dir < 0 ? start >= after : start + next.length <= after))
                    continue;
                if (next instanceof TreeBuffer) {
                    var index = next.findChild(0, next.buffer.length, dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - start);
                    if (index > -1)
                        return new BufferNode(new BufferContext(parent, next, i, start), null, index);
                }
                else if (!next.type.isRepeated || hasChild(next)) {
                    var inner = new TreeNode(next, start, i, parent);
                    return !inner.type.isRepeated ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, after);
                }
            }
            if (!parent.type.isRepeated)
                return null;
            i = parent.index + dir;
            parent = parent._parent;
        }
    };
    Object.defineProperty(TreeNode.prototype, "firstChild", {
        get: function () { return this.nextChild(0, 1, -100000000 /* None */); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "lastChild", {
        get: function () { return this.nextChild(this.node.children.length - 1, -1, -100000000 /* None */); },
        enumerable: true,
        configurable: true
    });
    TreeNode.prototype.childAfter = function (pos) { return this.nextChild(0, 1, pos); };
    TreeNode.prototype.childBefore = function (pos) { return this.nextChild(this.node.children.length - 1, -1, pos); };
    TreeNode.prototype.nextSignificant = function () {
        var val = this;
        while (val.type.isRepeated)
            val = val._parent;
        return val;
    };
    Object.defineProperty(TreeNode.prototype, "parent", {
        get: function () {
            return this._parent ? this._parent.nextSignificant() : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "nextSibling", {
        get: function () {
            return this._parent ? this._parent.nextChild(this.index + 1, 1, -1) : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "prevSibling", {
        get: function () {
            return this._parent ? this._parent.nextChild(this.index - 1, -1, -1) : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TreeNode.prototype, "cursor", {
        get: function () { return new TreeCursor(this); },
        enumerable: true,
        configurable: true
    });
    TreeNode.prototype.resolve = function (pos, side) {
        if (side === void 0) { side = 0; }
        return this.cursor.moveTo(pos, side).node;
    };
    TreeNode.prototype.getChild = function (type, before, after) {
        if (before === void 0) { before = null; }
        if (after === void 0) { after = null; }
        var r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
    };
    TreeNode.prototype.getChildren = function (type, before, after) {
        if (before === void 0) { before = null; }
        if (after === void 0) { after = null; }
        return getChildren(this, type, before, after);
    };
    /// @internal
    TreeNode.prototype.toString = function () { return this.node.toString(); };
    return TreeNode;
}());
function getChildren(node, type, before, after) {
    var cur = node.cursor, result = [];
    if (!cur.firstChild())
        return result;
    if (before != null)
        while (!cur.type.is(before))
            if (!cur.nextSibling())
                return result;
    for (;;) {
        if (after != null && cur.type.is(after))
            return result;
        if (cur.type.is(type))
            result.push(cur.node);
        if (!cur.nextSibling())
            return after == null ? result : [];
    }
}
var BufferContext = /** @class */ (function () {
    function BufferContext(parent, buffer, index, start) {
        this.parent = parent;
        this.buffer = buffer;
        this.index = index;
        this.start = start;
    }
    return BufferContext;
}());
var BufferNode = /** @class */ (function () {
    function BufferNode(context, _parent, index) {
        this.context = context;
        this._parent = _parent;
        this.index = index;
        this.type = context.buffer.group.types[context.buffer.buffer[index]];
    }
    Object.defineProperty(BufferNode.prototype, "name", {
        get: function () { return this.type.name; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferNode.prototype, "from", {
        get: function () { return this.context.start + this.context.buffer.buffer[this.index + 1]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferNode.prototype, "to", {
        get: function () { return this.context.start + this.context.buffer.buffer[this.index + 2]; },
        enumerable: true,
        configurable: true
    });
    BufferNode.prototype.child = function (dir, after) {
        var buffer = this.context.buffer;
        var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - this.context.start);
        return index < 0 ? null : new BufferNode(this.context, this, index);
    };
    Object.defineProperty(BufferNode.prototype, "firstChild", {
        get: function () { return this.child(1, -100000000 /* None */); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferNode.prototype, "lastChild", {
        get: function () { return this.child(-1, -100000000 /* None */); },
        enumerable: true,
        configurable: true
    });
    BufferNode.prototype.childAfter = function (pos) { return this.child(1, pos); };
    BufferNode.prototype.childBefore = function (pos) { return this.child(-1, pos); };
    Object.defineProperty(BufferNode.prototype, "parent", {
        get: function () {
            return this._parent || this.context.parent.nextSignificant();
        },
        enumerable: true,
        configurable: true
    });
    BufferNode.prototype.externalSibling = function (dir) {
        return this._parent ? null : this.context.parent.nextChild(this.context.index + dir, dir, -1);
    };
    Object.defineProperty(BufferNode.prototype, "nextSibling", {
        get: function () {
            var buffer = this.context.buffer;
            var after = buffer.buffer[this.index + 3];
            if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
                return new BufferNode(this.context, this._parent, after);
            return this.externalSibling(1);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferNode.prototype, "prevSibling", {
        get: function () {
            var buffer = this.context.buffer;
            var parentStart = this._parent ? this._parent.index + 4 : 0;
            if (this.index == parentStart)
                return this.externalSibling(-1);
            return new BufferNode(this.context, this._parent, buffer.findChild(parentStart, this.index, -1, -100000000 /* None */));
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferNode.prototype, "cursor", {
        get: function () { return new TreeCursor(this); },
        enumerable: true,
        configurable: true
    });
    BufferNode.prototype.resolve = function (pos, side) {
        if (side === void 0) { side = 0; }
        return this.cursor.moveTo(pos, side).node;
    };
    /// @internal
    BufferNode.prototype.toString = function () { return this.context.buffer.childString(this.index); };
    BufferNode.prototype.getChild = function (type, before, after) {
        if (before === void 0) { before = null; }
        if (after === void 0) { after = null; }
        var r = getChildren(this, type, before, after);
        return r.length ? r[0] : null;
    };
    BufferNode.prototype.getChildren = function (type, before, after) {
        if (before === void 0) { before = null; }
        if (after === void 0) { after = null; }
        return getChildren(this, type, before, after);
    };
    return BufferNode;
}());
/// A tree cursor object focuses on a given node in a syntax tree, and
/// allows you to move to adjacent nodes.
var TreeCursor = /** @class */ (function () {
    /// @internal
    function TreeCursor(node) {
        this.buffer = null;
        this.stack = [];
        this.index = 0;
        this.bufferNode = null;
        if (node instanceof TreeNode) {
            this.yieldNode(node);
        }
        else {
            this.tree = node.context.parent;
            this.buffer = node.context;
            for (var n = node._parent; n; n = n._parent)
                this.stack.unshift(n.index);
            this.bufferNode = node;
            this.yieldBuf(node.index);
        }
    }
    Object.defineProperty(TreeCursor.prototype, "name", {
        /// Shorthand for `.type.name`.
        get: function () { return this.type.name; },
        enumerable: true,
        configurable: true
    });
    TreeCursor.prototype.yieldNode = function (node) {
        if (!node)
            return false;
        this.tree = node;
        this.type = node.type;
        this.from = node.from;
        this.to = node.to;
        return true;
    };
    TreeCursor.prototype.yieldBuf = function (index, type) {
        this.index = index;
        var _a = this.buffer, start = _a.start, buffer = _a.buffer;
        this.type = type || buffer.group.types[buffer.buffer[index]];
        this.from = start + buffer.buffer[index + 1];
        this.to = start + buffer.buffer[index + 2];
        return true;
    };
    TreeCursor.prototype.yield = function (node) {
        if (!node)
            return false;
        if (node instanceof TreeNode) {
            this.buffer = null;
            return this.yieldNode(node);
        }
        this.buffer = node.context;
        return this.yieldBuf(node.index, node.type);
    };
    /// @internal
    TreeCursor.prototype.toString = function () {
        return this.buffer ? this.buffer.buffer.childString(this.index) : this.tree.toString();
    };
    /// @internal
    TreeCursor.prototype.enter = function (dir, after) {
        if (!this.buffer)
            return this.yield(this.tree.nextChild(dir < 0 ? this.tree.node.children.length - 1 : 0, dir, after));
        var buffer = this.buffer.buffer;
        var index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, after == -100000000 /* None */ ? -100000000 /* None */ : after - this.buffer.start);
        if (index < 0)
            return false;
        this.stack.push(this.index);
        return this.yieldBuf(index);
    };
    /// Move the cursor to this node's first child. When this returns
    /// false, the node has no child, and the cursor has not been moved.
    TreeCursor.prototype.firstChild = function () { return this.enter(1, -100000000 /* None */); };
    /// Move the cursor to this node's last child.
    TreeCursor.prototype.lastChild = function () { return this.enter(-1, -100000000 /* None */); };
    /// Move the cursor to the first child that starts at or after `pos`.
    TreeCursor.prototype.childAfter = function (pos) { return this.enter(1, pos); };
    /// Move to the last child that ends at or before `pos`.
    TreeCursor.prototype.childBefore = function (pos) { return this.enter(-1, pos); };
    /// Move the node's parent node, if this isn't the top node.
    TreeCursor.prototype.parent = function () {
        if (!this.buffer)
            return this.yieldNode(this.tree.parent);
        if (this.stack.length)
            return this.yieldBuf(this.stack.pop());
        var parent = this.buffer.parent.nextSignificant();
        this.buffer = null;
        return this.yieldNode(parent);
    };
    /// @internal
    TreeCursor.prototype.sibling = function (dir) {
        if (!this.buffer)
            return this.tree._parent ? this.yield(this.tree._parent.nextChild(this.tree.index + dir, dir, -100000000 /* None */)) : false;
        var buffer = this.buffer.buffer, d = this.stack.length - 1;
        if (dir < 0) {
            var parentStart = d < 0 ? 0 : this.stack[d] + 4;
            if (this.index != parentStart)
                return this.yieldBuf(buffer.findChild(parentStart, this.index, -1, -100000000 /* None */));
        }
        else {
            var after_1 = buffer.buffer[this.index + 3];
            if (after_1 < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
                return this.yieldBuf(after_1);
        }
        return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, -100000000 /* None */)) : false;
    };
    /// Move to this node's next sibling, if any.
    TreeCursor.prototype.nextSibling = function () { return this.sibling(1); };
    /// Move to this node's previous sibling, if any.
    TreeCursor.prototype.prevSibling = function () { return this.sibling(-1); };
    TreeCursor.prototype.atLastNode = function (dir) {
        var _a, _b;
        var index, parent, buffer = this.buffer;
        if (buffer) {
            if (dir > 0) {
                if (this.index < buffer.buffer.buffer.length)
                    return false;
            }
            else {
                for (var i = 0; i < this.index; i++)
                    if (buffer.buffer.buffer[i + 3] < this.index)
                        return false;
            }
            (index = buffer.index, parent = buffer.parent);
        }
        else {
            (_a = this.tree, index = _a.index, parent = _a._parent);
        }
        for (; parent; _b = parent, index = _b.index, parent = _b._parent, _b) {
            for (var i = index + dir, e = dir < 0 ? -1 : parent.node.children.length; i != e; i += dir) {
                var child = parent.node.children[i];
                if (!child.type.isRepeated || child instanceof TreeBuffer || hasChild(child))
                    return false;
            }
        }
        return true;
    };
    TreeCursor.prototype.move = function (dir) {
        if (this.enter(dir, -100000000 /* None */))
            return true;
        for (;;) {
            if (this.sibling(dir))
                return true;
            if (this.atLastNode(dir) || !this.parent())
                return false;
        }
    };
    /// Move to the next node in a
    /// [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order_(NLR))
    /// traversal, going from a node to its first child or, if the
    /// current node is empty, its next sibling or the next sibling of
    /// the first parent node that has one.
    TreeCursor.prototype.next = function () { return this.move(1); };
    /// Move to the next node in a last-to-first pre-order traveral. A
    /// node is followed by ist last child or, if it has none, its
    /// previous sibling or the previous sibling of the first parent
    /// node that has one.
    TreeCursor.prototype.prev = function () { return this.move(-1); };
    /// Move the cursor to the innermost node that covers `pos`. If
    /// `side` is -1, it will enter nodes that end at `pos`. If it is 1,
    /// it will enter nodes that start at `pos`.
    TreeCursor.prototype.moveTo = function (pos, side) {
        if (side === void 0) { side = 0; }
        // Move up to a node that actually holds the position, if possible
        while (this.from == this.to ||
            (side < 1 ? this.from >= pos : this.from > pos) ||
            (side > -1 ? this.to <= pos : this.to < pos))
            if (!this.parent())
                break;
        // Then scan down into child nodes as far as possible
        for (;;) {
            if (side < 0 ? !this.childBefore(pos) : !this.childAfter(pos))
                break;
            if (this.from == this.to ||
                (side < 1 ? this.from >= pos : this.from > pos) ||
                (side > -1 ? this.to <= pos : this.to < pos)) {
                this.parent();
                break;
            }
        }
        return this;
    };
    Object.defineProperty(TreeCursor.prototype, "node", {
        /// Get a [syntax node](#tree.SyntaxNode) at the cursor's current
        /// position.
        get: function () {
            if (!this.buffer)
                return this.tree;
            var cache = this.bufferNode, result = null, depth = 0;
            if (cache && cache.context == this.buffer) {
                scan: for (var index = this.index, d = this.stack.length; d >= 0;) {
                    for (var c = cache; c; c = c._parent)
                        if (c.index == index) {
                            if (index == this.index)
                                return c;
                            result = c;
                            depth = d + 1;
                            break scan;
                        }
                    index = this.stack[--d];
                }
            }
            for (var i = depth; i < this.stack.length; i++)
                result = new BufferNode(this.buffer, result, this.stack[i]);
            return this.bufferNode = new BufferNode(this.buffer, result, this.index);
        },
        enumerable: true,
        configurable: true
    });
    return TreeCursor;
}());
function hasChild(tree) {
    return tree.children.some(function (ch) { return !ch.type.isRepeated || ch instanceof TreeBuffer || hasChild(ch); });
}
var FlatBufferCursor = /** @class */ (function () {
    function FlatBufferCursor(buffer, index) {
        this.buffer = buffer;
        this.index = index;
    }
    Object.defineProperty(FlatBufferCursor.prototype, "id", {
        get: function () { return this.buffer[this.index - 4]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "start", {
        get: function () { return this.buffer[this.index - 3]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "end", {
        get: function () { return this.buffer[this.index - 2]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "size", {
        get: function () { return this.buffer[this.index - 1]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "pos", {
        get: function () { return this.index; },
        enumerable: true,
        configurable: true
    });
    FlatBufferCursor.prototype.next = function () { this.index -= 4; };
    FlatBufferCursor.prototype.fork = function () { return new FlatBufferCursor(this.buffer, this.index); };
    return FlatBufferCursor;
}());
var BalanceBranchFactor = 8;
function buildTree(data) {
    var _a = data, buffer = _a.buffer, group = _a.group, _b = _a.topID, topID = _b === void 0 ? 0 : _b, _c = _a.maxBufferLength, maxBufferLength = _c === void 0 ? DefaultBufferLength : _c, _d = _a.reused, reused = _d === void 0 ? [] : _d, _e = _a.minRepeatType, minRepeatType = _e === void 0 ? group.types.length : _e;
    var cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
    var types = group.types;
    function takeNode(parentStart, minPos, children, positions, inRepeat) {
        var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size;
        while (id == inRepeat) {
            cursor.next();
            (id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size);
        }
        var startPos = start - parentStart;
        if (size < 0) { // Reused node
            children.push(reused[id]);
            positions.push(startPos);
            cursor.next();
            return;
        }
        var type = types[id], node, buffer;
        if (end - start <= maxBufferLength && (buffer = findBufferSize(cursor.pos - minPos, inRepeat))) {
            // Small enough for a buffer, and no reused nodes inside
            var data_1 = new Uint16Array(buffer.size - buffer.skip);
            var endPos = cursor.pos - buffer.size, index = data_1.length;
            while (cursor.pos > endPos)
                index = copyToBuffer(buffer.start, data_1, index, inRepeat);
            node = new TreeBuffer(data_1, end - buffer.start, group, inRepeat < 0 ? NodeType.none : types[inRepeat]);
            startPos = buffer.start - parentStart;
        }
        else { // Make it a node
            var endPos = cursor.pos - size;
            cursor.next();
            var localChildren = [], localPositions = [];
            var localInRepeat = id >= minRepeatType ? id : -1;
            while (cursor.pos > endPos)
                takeNode(start, endPos, localChildren, localPositions, localInRepeat);
            localChildren.reverse();
            localPositions.reverse();
            if (localInRepeat > -1 && localChildren.length > BalanceBranchFactor)
                node = balanceRange(type, type, localChildren, localPositions, 0, localChildren.length, 0, maxBufferLength, end - start);
            else
                node = new Tree(type, localChildren, localPositions, end - start);
        }
        children.push(node);
        positions.push(startPos);
    }
    function findBufferSize(maxSize, inRepeat) {
        // Scan through the buffer to find previous siblings that fit
        // together in a TreeBuffer, and don't contain any reused nodes
        // (which can't be stored in a buffer).
        // If `inRepeat` is > -1, ignore node boundaries of that type for
        // nesting, but make sure the end falls either at the start
        // (`maxSize`) or before such a node.
        var fork = cursor.fork();
        var size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
        var result = { size: 0, start: 0, skip: 0 };
        scan: for (var minPos = fork.pos - maxSize; fork.pos > minPos;) {
            // Pretend nested repeat nodes of the same type don't exist
            if (fork.id == inRepeat) {
                // Except that we store the current state as a valid return
                // value.
                result.size = size;
                result.start = start;
                result.skip = skip;
                skip += 4;
                size += 4;
                fork.next();
                continue;
            }
            var nodeSize = fork.size, startPos = fork.pos - nodeSize;
            if (nodeSize < 0 || startPos < minPos || fork.start < minStart)
                break;
            var localSkipped = fork.id >= minRepeatType ? 4 : 0;
            var nodeStart = fork.start;
            fork.next();
            while (fork.pos > startPos) {
                if (fork.size < 0)
                    break scan;
                if (fork.id >= minRepeatType)
                    localSkipped += 4;
                fork.next();
            }
            start = nodeStart;
            size += nodeSize;
            skip += localSkipped;
        }
        if (inRepeat < 0 || size == maxSize) {
            result.size = size;
            result.start = start;
            result.skip = skip;
        }
        return result.size > 4 ? result : undefined;
    }
    function copyToBuffer(bufferStart, buffer, index, inRepeat) {
        var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size;
        cursor.next();
        if (id == inRepeat)
            return index;
        var startIndex = index;
        if (size > 4) {
            var endPos = cursor.pos - (size - 4);
            while (cursor.pos > endPos)
                index = copyToBuffer(bufferStart, buffer, index, inRepeat);
        }
        if (id < minRepeatType) { // Don't copy repeat nodes into buffers
            buffer[--index] = startIndex;
            buffer[--index] = end - bufferStart;
            buffer[--index] = start - bufferStart;
            buffer[--index] = id;
        }
        return index;
    }
    var children = [], positions = [];
    while (cursor.pos > 0)
        takeNode(0, 0, children, positions, -1);
    var length = children.length ? positions[0] + children[0].length : 0;
    return new Tree(group.types[topID], children.reverse(), positions.reverse(), length);
}
function balanceRange(outerType, innerType, children, positions, from, to, start, maxBufferLength, length) {
    var localChildren = [], localPositions = [];
    if (length <= maxBufferLength) {
        for (var i = from; i < to; i++) {
            localChildren.push(children[i]);
            localPositions.push(positions[i] - start);
        }
    }
    else {
        var maxChild = Math.max(maxBufferLength, Math.ceil(length * 1.5 / BalanceBranchFactor));
        for (var i = from; i < to;) {
            var groupFrom = i, groupStart = positions[i];
            i++;
            for (; i < to; i++) {
                var nextEnd = positions[i] + children[i].length;
                if (nextEnd - groupStart > maxChild)
                    break;
            }
            if (i == groupFrom + 1) {
                var only = children[groupFrom];
                if (only instanceof Tree && only.type == innerType && only.length > maxChild << 1) { // Too big, collapse
                    for (var j = 0; j < only.children.length; j++) {
                        localChildren.push(only.children[j]);
                        localPositions.push(only.positions[j] + groupStart - start);
                    }
                    continue;
                }
                localChildren.push(only);
            }
            else if (i == groupFrom + 1) {
                localChildren.push(children[groupFrom]);
            }
            else {
                var inner = balanceRange(innerType, innerType, children, positions, groupFrom, i, groupStart, maxBufferLength, positions[i - 1] + children[i - 1].length - groupStart);
                if (innerType != NodeType.none && !containsType(inner.children, innerType))
                    inner = new Tree(NodeType.none, inner.children, inner.positions, inner.length);
                localChildren.push(inner);
            }
            localPositions.push(groupStart - start);
        }
    }
    return new Tree(outerType, localChildren, localPositions, length);
}
function containsType(nodes, type) {
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var elt = nodes_1[_i];
        if (elt.type == type)
            return true;
    }
    return false;
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

/// A parse stack. These are used internally by the parser to track
/// parsing progress. They also provide some properties and methods
/// that external code such as a tokenizer can use to get information
/// about the parse state.
var Stack = /** @class */ (function () {
    /// @internal
    function Stack(
    /// A group of values that the stack will share with all
    /// split instances
    ///@internal
    cx, 
    /// Holds state, pos, value stack pos (15 bits array index, 15 bits
    /// buffer index) triplets for all but the top state
    /// @internal
    stack, 
    /// The current parse state @internal
    state, 
    // The position at which the next reduce should take place. This
    // can be less than `this.pos` when skipped expressions have been
    // added to the stack (which should be moved outside of the next
    // reduction)
    /// @internal
    reducePos, 
    /// The input position up to which this stack has parsed.
    pos, 
    /// The dynamic score of the stack, including dynamic precedence
    /// and error-recovery penalties
    /// @internal
    score, 
    // The output buffer. Holds (type, start, end, size) quads
    // representing nodes created by the parser, where `size` is
    // amount of buffer array entries covered by this node.
    /// @internal
    buffer, 
    // The base offset of the buffer. When stacks are split, the split
    // instance shared the buffer history with its parent up to
    // `bufferBase`, which is the absolute offset (including the
    // offset of previous splits) into the buffer at which this stack
    // starts writing.
    /// @internal
    bufferBase, 
    // A parent stack from which this was split off, if any. This is
    // set up so that it always points to a stack that has some
    // additional buffer content, never to a stack with an equal
    // `bufferBase`.
    /// @internal
    parent) {
        this.cx = cx;
        this.stack = stack;
        this.state = state;
        this.reducePos = reducePos;
        this.pos = pos;
        this.score = score;
        this.buffer = buffer;
        this.bufferBase = bufferBase;
        this.parent = parent;
    }
    /// @internal
    Stack.prototype.toString = function () {
        return "[" + this.stack.filter(function (_, i) { return i % 3 == 0; }).concat(this.state) + "]@" + this.pos + (this.score ? "!" + this.score : "");
    };
    // Start an empty stack
    /// @internal
    Stack.start = function (cx, state, pos) {
        if (pos === void 0) { pos = 0; }
        return new Stack(cx, [], state, pos, pos, 0, [], 0, null);
    };
    // Push a state onto the stack, tracking its start position as well
    // as the buffer base at that point.
    /// @internal
    Stack.prototype.pushState = function (state, start) {
        this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
        this.state = state;
    };
    // Apply a reduce action
    /// @internal
    Stack.prototype.reduce = function (action) {
        var depth = action >> 19 /* ReduceDepthShift */, type = action & 65535 /* ValueMask */;
        var parser = this.cx.parser;
        var dPrec = parser.dynamicPrecedence(type);
        if (dPrec)
            this.score += dPrec;
        if (depth == 0) {
            // Zero-depth reductions are a special case—they add stuff to
            // the stack without popping anything off.
            if (type < parser.minRepeatTerm)
                this.storeNode(type, this.reducePos, this.reducePos, 4, true);
            this.pushState(parser.getGoto(this.state, type, true), this.reducePos);
            return;
        }
        // Find the base index into `this.stack`, content after which will
        // be dropped. Note that with `StayFlag` reductions we need to
        // consume two extra frames (the dummy parent node for the skipped
        // expression and the state that we'll be staying in, which should
        // be moved to `this.state`).
        var base = this.stack.length - ((depth - 1) * 3) - (action & 262144 /* StayFlag */ ? 6 : 0);
        var start = this.stack[base - 2];
        var bufferBase = this.stack[base - 1], count = this.bufferBase + this.buffer.length - bufferBase;
        // Store normal terms or `R -> R R` repeat reductions
        if (type < parser.minRepeatTerm || (action & 131072 /* RepeatFlag */)) {
            var pos = parser.stateFlag(this.state, 1 /* Skipped */) ? this.pos : this.reducePos;
            this.storeNode(type, start, pos, count + 4, true);
        }
        if (action & 262144 /* StayFlag */) {
            this.state = this.stack[base];
        }
        else {
            var baseStateID = this.stack[base - 3];
            this.state = parser.getGoto(baseStateID, type, true);
        }
        while (this.stack.length > base)
            this.stack.pop();
    };
    // Shift a value into the buffer
    /// @internal
    Stack.prototype.storeNode = function (term, start, end, size, isReduce) {
        if (size === void 0) { size = 4; }
        if (isReduce === void 0) { isReduce = false; }
        if (term == 0 /* Err */) { // Try to omit/merge adjacent error nodes
            var cur = this, top = this.buffer.length;
            if (top == 0 && cur.parent) {
                top = cur.bufferBase - cur.parent.bufferBase;
                cur = cur.parent;
            }
            if (top > 0 && cur.buffer[top - 4] == 0 /* Err */ && cur.buffer[top - 1] > -1) {
                if (start == end)
                    return;
                if (cur.buffer[top - 2] >= start) {
                    cur.buffer[top - 2] = end;
                    return;
                }
            }
        }
        if (!isReduce || this.pos == end) { // Simple case, just append
            this.buffer.push(term, start, end, size);
        }
        else { // There may be skipped nodes that have to be moved forward
            var index = this.buffer.length;
            if (index > 0 && this.buffer[index - 4] != 0 /* Err */)
                while (index > 0 && this.buffer[index - 2] > end) {
                    // Move this record forward
                    this.buffer[index] = this.buffer[index - 4];
                    this.buffer[index + 1] = this.buffer[index - 3];
                    this.buffer[index + 2] = this.buffer[index - 2];
                    this.buffer[index + 3] = this.buffer[index - 1];
                    index -= 4;
                    if (size > 4)
                        size -= 4;
                }
            this.buffer[index] = term;
            this.buffer[index + 1] = start;
            this.buffer[index + 2] = end;
            this.buffer[index + 3] = size;
        }
    };
    // Apply a shift action
    /// @internal
    Stack.prototype.shift = function (action, next, nextEnd) {
        if (action & 131072 /* GotoFlag */) {
            this.pushState(action & 65535 /* ValueMask */, this.pos);
        }
        else if ((action & 262144 /* StayFlag */) == 0) { // Regular shift
            var start = this.pos, nextState = action, parser = this.cx.parser;
            if (nextEnd > this.pos || next <= parser.maxNode) {
                this.pos = nextEnd;
                if (!parser.stateFlag(nextState, 1 /* Skipped */))
                    this.reducePos = nextEnd;
            }
            this.pushState(nextState, start);
            if (next <= parser.maxNode)
                this.buffer.push(next, start, nextEnd, 4);
        }
        else { // Shift-and-stay, which means this is a skipped token
            if (next <= this.cx.parser.maxNode)
                this.buffer.push(next, this.pos, nextEnd, 4);
            this.pos = nextEnd;
        }
    };
    // Apply an action
    /// @internal
    Stack.prototype.apply = function (action, next, nextEnd) {
        if (action & 65536 /* ReduceFlag */)
            this.reduce(action);
        else
            this.shift(action, next, nextEnd);
    };
    // Add a prebuilt node into the buffer. This may be a reused node or
    // the result of running a nested parser.
    /// @internal
    Stack.prototype.useNode = function (value, next) {
        var index = this.cx.reused.length - 1;
        if (index < 0 || this.cx.reused[index] != value) {
            this.cx.reused.push(value);
            index++;
        }
        var start = this.pos;
        this.reducePos = this.pos = start + value.length;
        this.pushState(next, start);
        this.buffer.push(index, start, this.reducePos, -1 /* size < 0 means this is a reused value */);
    };
    // Split the stack. Due to the buffer sharing and the fact
    // that `this.stack` tends to stay quite shallow, this isn't very
    // expensive.
    /// @internal
    Stack.prototype.split = function () {
        var parent = this;
        var off = parent.buffer.length;
        // Because the top of the buffer (after this.pos) may be mutated
        // to reorder reductions and skipped tokens, and shared buffers
        // should be immutable, this copies any outstanding skipped tokens
        // to the new buffer, and puts the base pointer before them.
        while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
            off -= 4;
        var buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
        // Make sure parent points to an actual parent with content, if there is such a parent.
        while (parent && base == parent.bufferBase)
            parent = parent.parent;
        return new Stack(this.cx, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base, parent);
    };
    // Try to recover from an error by 'deleting' (ignoring) one token.
    /// @internal
    Stack.prototype.recoverByDelete = function (next, nextEnd) {
        var isNode = next <= this.cx.parser.maxNode;
        if (isNode)
            this.storeNode(next, this.pos, nextEnd);
        this.storeNode(0 /* Err */, this.pos, nextEnd, isNode ? 8 : 4);
        this.pos = this.reducePos = nextEnd;
        this.score -= 200 /* Token */;
    };
    /// Check if the given term would be able to be shifted (optionally
    /// after some reductions) on this stack. This can be useful for
    /// external tokenizers that want to make sure they only provide a
    /// given token when it applies.
    Stack.prototype.canShift = function (term) {
        for (var sim = new SimulatedStack(this);;) {
            var action = this.cx.parser.stateSlot(sim.top, 4 /* DefaultReduce */) || this.cx.parser.hasAction(sim.top, term);
            if ((action & 65536 /* ReduceFlag */) == 0)
                return true;
            if (action == 0)
                return false;
            sim.reduce(action);
        }
    };
    Object.defineProperty(Stack.prototype, "ruleStart", {
        /// Find the start position of the rule that is currently being parsed.
        get: function () {
            for (var state = this.state, base = this.stack.length;;) {
                var force = this.cx.parser.stateSlot(state, 5 /* ForcedReduce */);
                if (!(force & 65536 /* ReduceFlag */))
                    return 0;
                base -= 3 * (force >> 19 /* ReduceDepthShift */);
                if ((force & 65535 /* ValueMask */) < this.cx.parser.minRepeatTerm)
                    return this.stack[base + 1];
                state = this.stack[base];
            }
        },
        enumerable: true,
        configurable: true
    });
    /// Find the start position of an instance of any of the given term
    /// types, or return `null` when none of them are found.
    ///
    /// **Note:** this is only reliable when there is at least some
    /// state that unambiguously matches the given rule on the stack.
    /// I.e. if you have a grammar like this, where the difference
    /// between `a` and `b` is only apparent at the third token:
    ///
    ///     a { b | c }
    ///     b { "x" "y" "x" }
    ///     c { "x" "y" "z" }
    ///
    /// Then a parse state after `"x"` will not reliably tell you that
    /// `b` is on the stack. You _can_ pass `[b, c]` to reliably check
    /// for either of those two rules (assuming that `a` isn't part of
    /// some rule that includes other things starting with `"x"`).
    ///
    /// When `before` is given, this keeps scanning up the stack until
    /// it finds a match that starts before that position.
    Stack.prototype.startOf = function (types, before) {
        var state = this.state, frame = this.stack.length, parser = this.cx.parser;
        for (;;) {
            var force = parser.stateSlot(state, 5 /* ForcedReduce */);
            var depth = force >> 19 /* ReduceDepthShift */, term = force & 65535 /* ValueMask */;
            if (types.indexOf(term) > -1) {
                var base = frame - (3 * (force >> 19 /* ReduceDepthShift */)), pos = this.stack[base + 1];
                if (before == null || before > pos)
                    return pos;
            }
            if (frame == 0)
                return null;
            if (depth == 0) {
                frame -= 3;
                state = this.stack[frame];
            }
            else {
                frame -= 3 * (depth - 1);
                state = parser.getGoto(this.stack[frame - 3], term, true);
            }
        }
    };
    // Apply up to Recover.MaxNext recovery actions that conceptually
    // inserts some missing token or rule.
    /// @internal
    Stack.prototype.recoverByInsert = function (next) {
        var _this = this;
        if (this.stack.length >= 300 /* MaxInsertStackDepth */)
            return [];
        var nextStates = this.cx.parser.nextStates(this.state);
        if (nextStates.length > 4 /* MaxNext */ || this.stack.length >= 120 /* DampenInsertStackDepth */) {
            var best = nextStates.filter(function (s) { return s != _this.state && _this.cx.parser.hasAction(s, next); });
            if (this.stack.length < 120 /* DampenInsertStackDepth */)
                for (var i = 0; best.length < 4 /* MaxNext */ && i < nextStates.length; i++)
                    if (best.indexOf(nextStates[i]) < 0)
                        best.push(nextStates[i]);
            nextStates = best;
        }
        var result = [];
        for (var i = 0; i < nextStates.length && result.length < 4 /* MaxNext */; i++) {
            if (nextStates[i] == this.state)
                continue;
            var stack = this.split();
            stack.storeNode(0 /* Err */, stack.pos, stack.pos, 4, true);
            stack.pushState(nextStates[i], this.pos);
            stack.score -= 200 /* Token */;
            result.push(stack);
        }
        return result;
    };
    // Force a reduce, if possible. Return false if that can't
    // be done.
    /// @internal
    Stack.prototype.forceReduce = function () {
        var reduce = this.cx.parser.stateSlot(this.state, 5 /* ForcedReduce */);
        if ((reduce & 65536 /* ReduceFlag */) == 0)
            return false;
        if (!this.cx.parser.validAction(this.state, reduce)) {
            this.storeNode(0 /* Err */, this.reducePos, this.reducePos, 4, true);
            this.score -= 100 /* Reduce */;
        }
        this.reduce(reduce);
        return true;
    };
    /// @internal
    Stack.prototype.forceAll = function () {
        while (!this.cx.parser.stateFlag(this.state, 2 /* Accepting */) && this.forceReduce()) { }
        return this;
    };
    Object.defineProperty(Stack.prototype, "deadEnd", {
        /// Check whether this state has no further actions (assumed to be a direct descendant of the
        /// top state, since any other states must be able to continue
        /// somehow). @internal
        get: function () {
            if (this.stack.length != 3)
                return false;
            var parser = this.cx.parser;
            return parser.data[parser.stateSlot(this.state, 1 /* Actions */)] == 65535 /* End */ &&
                !parser.stateSlot(this.state, 4 /* DefaultReduce */);
        },
        enumerable: true,
        configurable: true
    });
    /// Restart the stack (put it back in its start state). Only safe
    /// when this.stack.length == 3 (state is directly below the top
    /// state). @internal
    Stack.prototype.restart = function () {
        this.state = this.stack[0];
        this.stack.length = 0;
    };
    /// @internal
    Stack.prototype.sameState = function (other) {
        if (this.state != other.state || this.stack.length != other.stack.length)
            return false;
        for (var i = 0; i < this.stack.length; i += 3)
            if (this.stack[i] != other.stack[i])
                return false;
        return true;
    };
    // Convert the stack's buffer to a syntax tree.
    /// @internal
    Stack.prototype.toTree = function () {
        return Tree.build({ buffer: StackBufferCursor.create(this),
            group: this.cx.parser.group,
            topID: this.cx.topTerm,
            maxBufferLength: this.cx.maxBufferLength,
            reused: this.cx.reused,
            minRepeatType: this.cx.parser.minRepeatTerm });
    };
    Object.defineProperty(Stack.prototype, "parser", {
        /// Get the parser used by this stack.
        get: function () { return this.cx.parser; },
        enumerable: true,
        configurable: true
    });
    /// Test whether a given dialect (by numeric ID, as exported from
    /// the terms file) is enabled.
    Stack.prototype.dialectEnabled = function (dialectID) { return this.cx.dialect.flags[dialectID]; };
    return Stack;
}());
var Recover;
(function (Recover) {
    Recover[Recover["Token"] = 200] = "Token";
    Recover[Recover["Reduce"] = 100] = "Reduce";
    Recover[Recover["MaxNext"] = 4] = "MaxNext";
    Recover[Recover["MaxInsertStackDepth"] = 300] = "MaxInsertStackDepth";
    Recover[Recover["DampenInsertStackDepth"] = 120] = "DampenInsertStackDepth";
})(Recover || (Recover = {}));
// Used to cheaply run some reductions to scan ahead without mutating
// an entire stack
var SimulatedStack = /** @class */ (function () {
    function SimulatedStack(stack) {
        this.stack = stack;
        this.top = stack.state;
        this.rest = stack.stack;
        this.offset = this.rest.length;
    }
    SimulatedStack.prototype.reduce = function (action) {
        var term = action & 65535 /* ValueMask */, depth = action >> 19 /* ReduceDepthShift */;
        if (depth == 0) {
            if (this.rest == this.stack.stack)
                this.rest = this.rest.slice();
            this.rest.push(this.top, 0, 0);
            this.offset += 3;
        }
        else {
            this.offset -= (depth - 1) * 3;
        }
        var goto = this.stack.cx.parser.getGoto(this.rest[this.offset - 3], term, true);
        this.top = goto;
    };
    return SimulatedStack;
}());
// This is given to `Tree.build` to build a buffer, and encapsulates
// the parent-stack-walking necessary to read the nodes.
var StackBufferCursor = /** @class */ (function () {
    function StackBufferCursor(stack, pos, index) {
        this.stack = stack;
        this.pos = pos;
        this.index = index;
        this.buffer = stack.buffer;
        if (this.index == 0)
            this.maybeNext();
    }
    StackBufferCursor.create = function (stack) {
        return new StackBufferCursor(stack, stack.bufferBase + stack.buffer.length, stack.buffer.length);
    };
    StackBufferCursor.prototype.maybeNext = function () {
        var next = this.stack.parent;
        if (next != null) {
            this.index = this.stack.bufferBase - next.bufferBase;
            this.stack = next;
            this.buffer = next.buffer;
        }
    };
    Object.defineProperty(StackBufferCursor.prototype, "id", {
        get: function () { return this.buffer[this.index - 4]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "start", {
        get: function () { return this.buffer[this.index - 3]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "end", {
        get: function () { return this.buffer[this.index - 2]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "size", {
        get: function () { return this.buffer[this.index - 1]; },
        enumerable: true,
        configurable: true
    });
    StackBufferCursor.prototype.next = function () {
        this.index -= 4;
        this.pos -= 4;
        if (this.index == 0)
            this.maybeNext();
    };
    StackBufferCursor.prototype.fork = function () {
        return new StackBufferCursor(this.stack, this.pos, this.index);
    };
    return StackBufferCursor;
}());

/// Tokenizers write the tokens they read into instances of this class.
var Token = /** @class */ (function () {
    function Token() {
        /// The start of the token. This is set by the parser, and should not
        /// be mutated by the tokenizer.
        this.start = -1;
        /// This starts at -1, and should be updated to a term id when a
        /// matching token is found.
        this.value = -1;
        /// When setting `.value`, you should also set `.end` to the end
        /// position of the token. (You'll usually want to use the `accept`
        /// method.)
        this.end = -1;
    }
    /// Accept a token, setting `value` and `end` to the given values.
    Token.prototype.accept = function (value, end) {
        this.value = value;
        this.end = end;
    };
    return Token;
}());
/// An `InputStream` that is backed by a single, flat string.
var StringStream = /** @class */ (function () {
    function StringStream(string, length) {
        if (length === void 0) { length = string.length; }
        this.string = string;
        this.length = length;
    }
    StringStream.prototype.get = function (pos) {
        return pos < 0 || pos >= this.length ? -1 : this.string.charCodeAt(pos);
    };
    StringStream.prototype.read = function (from, to) { return this.string.slice(from, Math.min(this.length, to)); };
    StringStream.prototype.clip = function (at) { return new StringStream(this.string, at); };
    return StringStream;
}());
/// @internal
var TokenGroup = /** @class */ (function () {
    function TokenGroup(data, id) {
        this.data = data;
        this.id = id;
    }
    TokenGroup.prototype.token = function (input, token, stack) { readToken(this.data, input, token, stack, this.id); };
    return TokenGroup;
}());
TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
/// Exports that are used for `@external tokens` in the grammar should
/// export an instance of this class.
var ExternalTokenizer = /** @class */ (function () {
    /// Create a tokenizer. The first argument is the function that,
    /// given an input stream and a token object,
    /// [fills](#lezer.Token.accept) the token object if it recognizes a
    /// token. `token.start` should be used as the start position to
    /// scan from.
    function ExternalTokenizer(
    /// @internal
    token, options) {
        if (options === void 0) { options = {}; }
        this.token = token;
        this.contextual = !!options.contextual;
        this.fallback = !!options.fallback;
        this.extend = !!options.extend;
    }
    return ExternalTokenizer;
}());
// Tokenizer data is stored a big uint16 array containing, for each
// state:
//
//  - A group bitmask, indicating what token groups are reachable from
//    this state, so that paths that can only lead to tokens not in
//    any of the current groups can be cut off early.
//
//  - The position of the end of the state's sequence of accepting
//    tokens
//
//  - The number of outgoing edges for the state
//
//  - The accepting tokens, as (token id, group mask) pairs
//
//  - The outgoing edges, as (start character, end character, state
//    index) triples, with end character being exclusive
//
// This function interprets that data, running through a stream as
// long as new states with the a matching group mask can be reached,
// and updating `token` when it matches a token.
function readToken(data, input, token, stack, group) {
    var state = 0, groupMask = 1 << group, dialect = stack.cx.dialect;
    scan: for (var pos = token.start;;) {
        if ((groupMask & data[state]) == 0)
            break;
        var accEnd = data[state + 1];
        // Check whether this state can lead to a token in the current group
        // Accept tokens in this state, possibly overwriting
        // lower-precedence / shorter tokens
        for (var i = state + 3; i < accEnd; i += 2)
            if ((data[i + 1] & groupMask) > 0) {
                var term = data[i];
                if (dialect.allows(term) &&
                    (token.value == -1 || token.value == term || stack.cx.parser.overrides(term, token.value))) {
                    token.accept(term, pos);
                    break;
                }
            }
        var next = input.get(pos++);
        // Do a binary search on the state's edges
        for (var low = 0, high = data[state + 2]; low < high;) {
            var mid = (low + high) >> 1;
            var index = accEnd + mid + (mid << 1);
            var from = data[index], to = data[index + 1];
            if (next < from)
                high = mid;
            else if (next >= to)
                low = mid + 1;
            else {
                state = data[index + 2];
                continue scan;
            }
        }
        break;
    }
}

// See lezer-generator/src/encode.ts for comments about the encoding
// used here
function decodeArray(input, Type) {
    if (Type === void 0) { Type = Uint16Array; }
    if (typeof input != "string")
        return input;
    var array = null;
    for (var pos = 0, out = 0; pos < input.length;) {
        var value = 0;
        for (;;) {
            var next = input.charCodeAt(pos++), stop = false;
            if (next == 126 /* BigValCode */) {
                value = 65535 /* BigVal */;
                break;
            }
            if (next >= 92 /* Gap2 */)
                next--;
            if (next >= 34 /* Gap1 */)
                next--;
            var digit = next - 32 /* Start */;
            if (digit >= 46 /* Base */) {
                digit -= 46 /* Base */;
                stop = true;
            }
            value += digit;
            if (stop)
                break;
            value *= 46 /* Base */;
        }
        if (array)
            array[out++] = value;
        else
            array = new Type(value);
    }
    return array;
}

// Environment variable used to control console output
var verbose = typeof process != "undefined" && /\bparse\b/.test(process.env.LOG);
var stackIDs = null;
var CacheCursor = /** @class */ (function () {
    function CacheCursor(tree) {
        this.start = [0];
        this.index = [0];
        this.nextStart = 0;
        this.trees = [tree];
    }
    // `pos` must be >= any previously given `pos` for this cursor
    CacheCursor.prototype.nodeAt = function (pos) {
        if (pos < this.nextStart)
            return null;
        for (;;) {
            var last = this.trees.length - 1;
            if (last < 0) { // End of tree
                this.nextStart = 1e9;
                return null;
            }
            var top = this.trees[last], index = this.index[last];
            if (index == top.children.length) {
                this.trees.pop();
                this.start.pop();
                this.index.pop();
                continue;
            }
            var next = top.children[index];
            var start = this.start[last] + top.positions[index];
            if (start >= pos)
                return start == pos ? next : null;
            if (next instanceof TreeBuffer) {
                this.index[last]++;
                this.nextStart = start + next.length;
            }
            else {
                this.index[last]++;
                if (start + next.length >= pos) { // Enter this node
                    this.trees.push(next);
                    this.start.push(start);
                    this.index.push(0);
                }
            }
        }
    };
    return CacheCursor;
}());
var CachedToken = /** @class */ (function (_super) {
    __extends(CachedToken, _super);
    function CachedToken() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.extended = -1;
        _this.mask = 0;
        return _this;
    }
    CachedToken.prototype.clear = function (start) {
        this.start = start;
        this.value = this.extended = -1;
    };
    return CachedToken;
}(Token));
var dummyToken = new Token;
var TokenCache = /** @class */ (function () {
    function TokenCache(parser) {
        this.tokens = [];
        this.mainToken = dummyToken;
        this.actions = [];
        this.tokens = parser.tokenizers.map(function (_) { return new CachedToken; });
    }
    TokenCache.prototype.getActions = function (stack, input) {
        var actionIndex = 0;
        var main = null;
        var parser = stack.cx.parser, tokenizers = parser.tokenizers;
        var mask = parser.stateSlot(stack.state, 3 /* TokenizerMask */);
        for (var i = 0; i < tokenizers.length; i++) {
            if (((1 << i) & mask) == 0)
                continue;
            var tokenizer = tokenizers[i], token = this.tokens[i];
            if (main && !tokenizer.fallback)
                continue;
            if (tokenizer.contextual || token.start != stack.pos || token.mask != mask) {
                this.updateCachedToken(token, tokenizer, stack, input);
                token.mask = mask;
            }
            if (token.value != 0 /* Err */) {
                var startIndex = actionIndex;
                if (token.extended > -1)
                    actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
                actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
                if (!tokenizer.extend) {
                    main = token;
                    if (actionIndex > startIndex)
                        break;
                }
            }
        }
        while (this.actions.length > actionIndex)
            this.actions.pop();
        if (!main) {
            main = dummyToken;
            main.start = stack.pos;
            if (stack.pos == input.length)
                main.accept(stack.cx.parser.eofTerm, stack.pos);
            else
                main.accept(0 /* Err */, stack.pos + 1);
        }
        this.mainToken = main;
        return this.actions;
    };
    TokenCache.prototype.updateCachedToken = function (token, tokenizer, stack, input) {
        token.clear(stack.pos);
        tokenizer.token(input, token, stack);
        if (token.value > -1) {
            var parser = stack.cx.parser;
            for (var i = 0; i < parser.specialized.length; i++)
                if (parser.specialized[i] == token.value) {
                    var result = parser.specializers[i](input.read(token.start, token.end), stack);
                    if (result >= 0 && stack.cx.dialect.allows(result >> 1)) {
                        if ((result & 1) == 0 /* Specialize */)
                            token.value = result >> 1;
                        else
                            token.extended = result >> 1;
                        break;
                    }
                }
        }
        else if (stack.pos == input.length) {
            token.accept(stack.cx.parser.eofTerm, stack.pos);
        }
        else {
            token.accept(0 /* Err */, stack.pos + 1);
        }
    };
    TokenCache.prototype.putAction = function (action, token, end, index) {
        // Don't add duplicate actions
        for (var i = 0; i < index; i += 3)
            if (this.actions[i] == action)
                return index;
        this.actions[index++] = action;
        this.actions[index++] = token;
        this.actions[index++] = end;
        return index;
    };
    TokenCache.prototype.addActions = function (stack, token, end, index) {
        var state = stack.state, parser = stack.cx.parser, data = parser.data;
        for (var set = 0; set < 2; set++) {
            for (var i = parser.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */);; i += 3) {
                if (data[i] == 65535 /* End */) {
                    if (data[i + 1] == 1 /* Next */) {
                        i = pair(data, i + 2);
                    }
                    else {
                        if (index == 0 && data[i + 1] == 2 /* Other */)
                            index = this.putAction(pair(data, i + 1), token, end, index);
                        break;
                    }
                }
                if (data[i] == token)
                    index = this.putAction(pair(data, i + 1), token, end, index);
            }
        }
        return index;
    };
    return TokenCache;
}());
var StackContext = /** @class */ (function () {
    function StackContext(parser, maxBufferLength, input, topTerm, dialect, parent, wrapType // Set to -2 when a stack descending from this nesting event finishes
    ) {
        if (parent === void 0) { parent = null; }
        if (wrapType === void 0) { wrapType = -1; }
        this.parser = parser;
        this.maxBufferLength = maxBufferLength;
        this.input = input;
        this.topTerm = topTerm;
        this.dialect = dialect;
        this.parent = parent;
        this.wrapType = wrapType;
        this.reused = [];
        this.tokens = new TokenCache(parser);
    }
    return StackContext;
}());
var recoverDist = 5, maxRemainingPerStep = 3, minBufferLengthPrune = 200, forceReduceLimit = 10;
/// A parse context can be used for step-by-step parsing. After
/// creating it, you repeatedly call `.advance()` until it returns a
/// tree to indicate it has reached the end of the parse.
var ParseContext = /** @class */ (function () {
    /// @internal
    function ParseContext(parser, input, options) {
        if (options === void 0) { options = {}; }
        // The position to which the parse has advanced.
        this.pos = 0;
        this.recovering = 0;
        this.tokenCount = 0;
        this.nextStackID = 0x2654;
        var _a = options.cache, cache = _a === void 0 ? undefined : _a, _b = options.strict, strict = _b === void 0 ? false : _b, _c = options.bufferLength, bufferLength = _c === void 0 ? DefaultBufferLength : _c, _d = options.top, top = _d === void 0 ? undefined : _d, dialect = options.dialect;
        var topInfo = top ? parser.topRules[top] : parser.defaultTop;
        if (!topInfo)
            throw new RangeError("Invalid top rule name " + top);
        this.stacks = [Stack.start(new StackContext(parser, bufferLength, input, topInfo[1], parser.parseDialect(dialect)), topInfo[0])];
        this.strict = strict;
        this.cache = cache ? new CacheCursor(cache) : null;
    }
    /// @internal
    ParseContext.prototype.putStack = function (stack) {
        this.stacks.push(stack);
        if (this.pos < 0 || stack.pos < this.pos)
            this.pos = stack.pos;
    };
    /// @internal
    ParseContext.prototype.putStackDedup = function (stack) {
        for (var i = 0; i < this.stacks.length; i++) {
            var other = this.stacks[i];
            if (other.pos == stack.pos && other.sameState(stack)) {
                if (this.stacks[i].score < stack.score)
                    this.stacks[i] = stack;
                return;
            }
        }
        this.putStack(stack);
    };
    /// Move the parser forward. This will process all parse stacks at
    /// `this.pos` and try to advance them to a further position. If no
    /// stack for such a position is found, it'll start error-recovery.
    ///
    /// When the parse is finished, this will return a syntax tree. When
    /// not, it returns `null`.
    ParseContext.prototype.advance = function () {
        var stacks = this.stacks, pos = this.pos;
        // This will now hold stacks beyond `pos`.
        this.stacks = [];
        // Will be reset to the next position by `putStack`.
        this.pos = -1;
        var stopped = null, stoppedTokens = null;
        // Keep advancing any stacks at `pos` until they either move
        // forward or can't be advanced. Gather stacks that can't be
        // advanced further in `stopped`.
        for (var i = 0; i < stacks.length; i++) {
            var stack = stacks[i];
            for (;;) {
                if (stack.pos > pos) {
                    this.putStack(stack);
                }
                else {
                    var result = this.advanceStack(stack, stacks);
                    if (result) {
                        stack = result;
                        continue;
                    }
                    else {
                        if (!stopped) {
                            stopped = [];
                            stoppedTokens = [];
                        }
                        stopped.push(stack);
                        var tok = stack.cx.tokens.mainToken;
                        stoppedTokens.push(tok.value, tok.end);
                    }
                }
                break;
            }
        }
        if (!this.stacks.length) {
            var finished = stopped && findFinished(stopped);
            if (finished)
                return finished.toTree();
            if (this.strict) {
                if (verbose && stopped)
                    console.log("Stuck with token " + stopped[0].cx.parser.getName(stopped[0].cx.tokens.mainToken.value));
                throw new SyntaxError("No parse at " + pos);
            }
            if (!this.recovering)
                this.recovering = recoverDist;
        }
        if (this.recovering && stopped) {
            var finished = this.runRecovery(stopped, stoppedTokens);
            if (finished)
                return finished.forceAll().toTree();
        }
        if (this.recovering) {
            var maxRemaining = this.recovering == 1 ? 1 : this.recovering * maxRemainingPerStep;
            if (this.stacks.length > maxRemaining) {
                this.stacks.sort(function (a, b) { return b.score - a.score; });
                this.stacks.length = maxRemaining;
            }
            if (this.stacks.some(function (s) { return s.reducePos > pos; }))
                this.recovering--;
        }
        else if (this.stacks.length > 1) {
            // Prune stacks that are in the same state, or that have been
            // running without splitting for a while, to avoid getting stuck
            // with multiple successful stacks running endlessly on.
            outer: for (var i = 0; i < this.stacks.length - 1; i++) {
                var stack = this.stacks[i];
                for (var j = i + 1; j < this.stacks.length; j++) {
                    var other = this.stacks[j];
                    if (stack.sameState(other) ||
                        stack.buffer.length > minBufferLengthPrune && other.buffer.length > minBufferLengthPrune) {
                        if (((stack.score - other.score) || (stack.buffer.length - other.buffer.length)) > 0) {
                            this.stacks.splice(j--, 1);
                        }
                        else {
                            this.stacks.splice(i--, 1);
                            continue outer;
                        }
                    }
                }
            }
        }
        this.tokenCount++;
        return null;
    };
    // Returns an updated version of the given stack, or null if the
    // stack can't advance normally. When `split` is given, stacks split
    // off by ambiguous operations will be pushed to that, or given to
    // `putStack` if they move `pos` forward.
    ParseContext.prototype.advanceStack = function (stack, split) {
        var start = stack.pos, _a = stack.cx, input = _a.input, parser = _a.parser;
        var base = verbose ? this.stackID(stack) + " -> " : "";
        if (this.cache) {
            for (var cached = this.cache.nodeAt(start); cached;) {
                var match = parser.group.types[cached.type.id] == cached.type ? parser.getGoto(stack.state, cached.type.id) : -1;
                if (match > -1) {
                    stack.useNode(cached, match);
                    if (verbose)
                        console.log(base + this.stackID(stack) + (" (via reuse of " + parser.getName(cached.type.id) + ")"));
                    return stack;
                }
                if (!(cached instanceof Tree) || cached.children.length == 0 || cached.positions[0] > 0)
                    break;
                var inner = cached.children[0];
                if (inner instanceof Tree)
                    cached = inner;
                else
                    break;
            }
        }
        var nest = parser.startNested(stack.state);
        maybeNest: if (nest > -1) {
            var _b = parser.nested[nest], grammar = _b.grammar, endToken = _b.end, placeholder = _b.placeholder;
            var filterEnd = undefined, parseNode = null, nested = void 0, top = void 0, dialect = void 0, wrapType = undefined;
            if (typeof grammar == "function") {
                var query = grammar(input, stack);
                if (query.stay)
                    break maybeNest;
                (parseNode = query.parseNode, nested = query.parser, top = query.top, dialect = query.dialect, filterEnd = query.filterEnd, wrapType = query.wrapType);
            }
            else {
                nested = grammar;
            }
            var end = this.scanForNestEnd(stack, endToken, filterEnd);
            var clippedInput = stack.cx.input.clip(end);
            if (parseNode || !nested) {
                var node = parseNode ? parseNode(clippedInput, stack.pos) : Tree.empty;
                if (node.length != end - stack.pos)
                    node = new Tree(node.type, node.children, node.positions, end - stack.pos);
                if (wrapType != null)
                    node = new Tree(parser.group.types[wrapType], [node], [0], node.length);
                stack.useNode(node, parser.getGoto(stack.state, placeholder, true));
                return stack;
            }
            else {
                var topInfo = top ? nested.topRules[top] : nested.defaultTop;
                var newStack = Stack.start(new StackContext(nested, stack.cx.maxBufferLength, clippedInput, topInfo[1], nested.parseDialect(dialect), stack, wrapType), topInfo[0], stack.pos);
                if (verbose)
                    console.log(base + this.stackID(newStack) + " (nested)");
                return newStack;
            }
        }
        var defaultReduce = parser.stateSlot(stack.state, 4 /* DefaultReduce */);
        if (defaultReduce > 0) {
            stack.reduce(defaultReduce);
            if (verbose)
                console.log(base + this.stackID(stack) + (" (via always-reduce " + parser.getName(defaultReduce & 65535 /* ValueMask */) + ")"));
            return stack;
        }
        var actions = stack.cx.tokens.getActions(stack, input);
        for (var i = 0; i < actions.length;) {
            var action = actions[i++], term = actions[i++], end = actions[i++];
            var last = i == actions.length || !split;
            var localStack = last ? stack : stack.split();
            localStack.apply(action, term, end);
            if (verbose)
                console.log(base + this.stackID(localStack) + (" (via " + ((action & 65536 /* ReduceFlag */) == 0 ? "shift"
                    : "reduce of " + parser.getName(action & 65535 /* ValueMask */)) + " for " + parser.getName(term) + " @ " + start + (localStack == stack ? "" : ", split") + ")"));
            if (last)
                return localStack;
            else if (localStack.pos > start)
                this.putStack(localStack);
            else
                split.push(localStack);
        }
        if (stack.cx.parent && stack.pos == input.length)
            return this.finishNested(stack);
        return null;
    };
    // Advance a given stack forward as far as it will go. Returns the
    // (possibly updated) stack if it got stuck, or null if it moved
    // forward and was given to `putStackDedup`.
    ParseContext.prototype.advanceFully = function (stack) {
        var pos = stack.pos;
        for (;;) {
            var result = this.advanceStack(stack, null);
            if (!result)
                return stack;
            if (result.pos > pos) {
                this.putStackDedup(result);
                return null;
            }
            stack = result;
        }
    };
    ParseContext.prototype.runRecovery = function (stacks, tokens) {
        var finished = null, restarted = false;
        for (var i = 0; i < stacks.length; i++) {
            var stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
            var base = verbose ? this.stackID(stack) + " -> " : "";
            if (stack.deadEnd) {
                if (restarted)
                    continue;
                restarted = true;
                stack.restart();
                if (verbose)
                    console.log(base + this.stackID(stack) + " (restarted)");
                var stopped = this.advanceFully(stack);
                if (stopped)
                    stack = stopped;
                else
                    continue;
            }
            var force = stack.split(), forceBase = base;
            for (var j = 0; force.forceReduce() && j < forceReduceLimit; j++) {
                if (verbose)
                    console.log(forceBase + this.stackID(force) + " (via force-reduce)");
                var stopped = this.advanceFully(force);
                if (!stopped)
                    break;
                force = stopped;
                if (verbose)
                    forceBase = this.stackID(stopped) + " -> ";
            }
            for (var _i = 0, _a = stack.recoverByInsert(token); _i < _a.length; _i++) {
                var insert = _a[_i];
                if (verbose)
                    console.log(base + this.stackID(insert) + " (via recover-insert)");
                this.advanceFully(insert);
            }
            if (stack.cx.input.length > stack.pos) {
                if (tokenEnd == stack.pos) {
                    tokenEnd++;
                    token = 0 /* Err */;
                }
                stack.recoverByDelete(token, tokenEnd);
                if (verbose)
                    console.log(base + this.stackID(stack) + (" (via recover-delete " + stack.cx.parser.getName(token) + ")"));
                this.putStackDedup(stack);
            }
            else if (!stack.cx.parent && (!finished || finished.score < stack.score)) {
                finished = stack;
            }
        }
        return finished;
    };
    /// Force the parse to finish, generating a tree containing the nodes
    /// parsed so far.
    ParseContext.prototype.forceFinish = function () {
        return this.stacks[0].split().forceAll().toTree();
    };
    Object.defineProperty(ParseContext.prototype, "badness", {
        /// A value that indicates how successful the parse is so far, as
        /// the number of error-recovery steps taken divided by the number
        /// of tokens parsed. Could be used to decide to abort a parse when
        /// the input doesn't appear to match the grammar at all.
        get: function () {
            if (!this.stacks.length)
                return 0;
            return -(this.stacks[0].score / (200 /* Token */ * this.tokenCount));
        },
        enumerable: true,
        configurable: true
    });
    ParseContext.prototype.scanForNestEnd = function (stack, endToken, filter) {
        var input = stack.cx.input;
        for (var pos = stack.pos; pos < input.length; pos++) {
            dummyToken.start = pos;
            dummyToken.value = -1;
            endToken.token(input, dummyToken, stack);
            if (dummyToken.value > -1 && (!filter || filter(input.read(pos, dummyToken.end))))
                return pos;
        }
        return input.length;
    };
    ParseContext.prototype.finishNested = function (stack) {
        if (stack.cx.wrapType == -2)
            return null; // Another nested stack already finished
        var parent = stack.cx.parent, tree = stack.forceAll().toTree();
        var parentParser = parent.cx.parser, info = parentParser.nested[parentParser.startNested(parent.state)];
        tree = new Tree(tree.type, tree.children, tree.positions.map(function (p) { return p - parent.pos; }), stack.pos - parent.pos);
        if (stack.cx.wrapType > -1)
            tree = new Tree(parentParser.group.types[stack.cx.wrapType], [tree], [0], tree.length);
        stack.cx.wrapType = -2;
        parent.useNode(tree, parentParser.getGoto(parent.state, info.placeholder, true));
        if (verbose)
            console.log(this.stackID(parent) + (" (via unnest " + (stack.cx.wrapType > -1 ? parentParser.getName(stack.cx.wrapType) : tree.type.name) + ")"));
        return parent;
    };
    ParseContext.prototype.stackID = function (stack) {
        var id = (stackIDs || (stackIDs = new WeakMap)).get(stack);
        if (!id)
            stackIDs.set(stack, id = String.fromCodePoint(this.nextStackID++));
        return id + stack;
    };
    return ParseContext;
}());
var Dialect = /** @class */ (function () {
    function Dialect(source, flags, disabled) {
        this.source = source;
        this.flags = flags;
        this.disabled = disabled;
    }
    Dialect.prototype.allows = function (term) { return !this.disabled || this.disabled[term] == 0; };
    return Dialect;
}());
/// A parser holds the parse tables for a given grammar, as generated
/// by `lezer-generator`.
var Parser = /** @class */ (function () {
    /// @internal
    function Parser(spec) {
        var _this = this;
        this.nextStateCache = [];
        this.cachedDialect = null;
        if (spec.version != 12 /* Version */)
            throw new RangeError("Parser version (" + spec.version + ") doesn't match runtime version (" + 12 /* Version */ + ")");
        var tokenArray = decodeArray(spec.tokenData);
        var nodeNames = spec.nodeNames.split(" ");
        this.minRepeatTerm = nodeNames.length;
        for (var i = 0; i < spec.repeatNodeCount; i++)
            nodeNames.push("");
        var nodeProps = [];
        for (var i = 0; i < nodeNames.length; i++)
            nodeProps.push(noProps);
        function setProp(nodeID, prop, value) {
            if (nodeProps[nodeID] == noProps)
                nodeProps[nodeID] = Object.create(null);
            prop.set(nodeProps[nodeID], prop.deserialize(String(value)));
        }
        if (spec.nodeProps)
            for (var _i = 0, _a = spec.nodeProps; _i < _a.length; _i++) {
                var propSpec = _a[_i];
                var prop = propSpec[0];
                for (var i = 1; i < propSpec.length;) {
                    var next = propSpec[i++];
                    if (next >= 0) {
                        setProp(next, prop, propSpec[i++]);
                    }
                    else {
                        var value = propSpec[i + -next];
                        for (var j = -next; j > 0; j--)
                            setProp(propSpec[i++], prop, value);
                        i++;
                    }
                }
            }
        this.specialized = new Uint16Array(spec.specialized ? spec.specialized.length : 0);
        this.specializers = [];
        if (spec.specialized)
            for (var i = 0; i < spec.specialized.length; i++) {
                this.specialized[i] = spec.specialized[i].term;
                this.specializers[i] = spec.specialized[i].get;
            }
        this.states = decodeArray(spec.states, Uint32Array);
        this.data = decodeArray(spec.stateData);
        this.goto = decodeArray(spec.goto);
        var topTerms = Object.keys(spec.topRules).map(function (r) { return spec.topRules[r][1]; });
        this.group = new NodeGroup(nodeNames.map(function (name, i) {
            var flags = (i >= _this.minRepeatTerm ? 8 /* Repeated */ : 0) |
                (topTerms.indexOf(i) > -1 ? 1 /* Top */ : 0) |
                (i == 0 ? 4 /* Error */ : 0) |
                (spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1 ? 2 /* Skipped */ : 0);
            return new NodeType(name, nodeProps[i], i, flags);
        }));
        this.maxTerm = spec.maxTerm;
        this.tokenizers = spec.tokenizers.map(function (value) { return typeof value == "number" ? new TokenGroup(tokenArray, value) : value; });
        this.topRules = spec.topRules;
        this.nested = (spec.nested || []).map(function (_a) {
            var name = _a[0], grammar = _a[1], endToken = _a[2], placeholder = _a[3];
            return { name: name, grammar: grammar, end: new TokenGroup(decodeArray(endToken), 0), placeholder: placeholder };
        });
        this.dialects = spec.dialects || {};
        this.dynamicPrecedences = spec.dynamicPrecedences || null;
        this.tokenPrecTable = spec.tokenPrec;
        this.termNames = spec.termNames || null;
        this.maxNode = this.group.types.length - 1;
        for (var i = 0, l = this.states.length / 6 /* Size */; i < l; i++)
            this.nextStateCache[i] = null;
    }
    /// Parse a given string or stream.
    Parser.prototype.parse = function (input, options) {
        if (typeof input == "string")
            input = new StringStream(input);
        var cx = new ParseContext(this, input, options);
        for (;;) {
            var done = cx.advance();
            if (done)
                return done;
        }
    };
    /// Create a `ParseContext`.
    Parser.prototype.startParse = function (input, options) {
        if (typeof input == "string")
            input = new StringStream(input);
        return new ParseContext(this, input, options);
    };
    /// Get a goto table entry @internal
    Parser.prototype.getGoto = function (state, term, loose) {
        if (loose === void 0) { loose = false; }
        var table = this.goto;
        if (term >= table[0])
            return -1;
        for (var pos = table[term + 1];;) {
            var groupTag = table[pos++], last = groupTag & 1;
            var target = table[pos++];
            if (last && loose)
                return target;
            for (var end = pos + (groupTag >> 1); pos < end; pos++)
                if (table[pos] == state)
                    return target;
            if (last)
                return -1;
        }
    };
    /// Check if this state has an action for a given terminal @internal
    Parser.prototype.hasAction = function (state, terminal) {
        var data = this.data;
        for (var set = 0; set < 2; set++) {
            for (var i = this.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next = void 0;; i += 3) {
                if ((next = data[i]) == 65535 /* End */) {
                    if (data[i + 1] == 1 /* Next */)
                        next = data[i = pair(data, i + 2)];
                    else if (data[i + 1] == 2 /* Other */)
                        return pair(data, i + 2);
                    else
                        break;
                }
                if (next == terminal || next == 0 /* Err */)
                    return pair(data, i + 1);
            }
        }
        return 0;
    };
    /// @internal
    Parser.prototype.stateSlot = function (state, slot) {
        return this.states[(state * 6 /* Size */) + slot];
    };
    /// @internal
    Parser.prototype.stateFlag = function (state, flag) {
        return (this.stateSlot(state, 0 /* Flags */) & flag) > 0;
    };
    /// @internal
    Parser.prototype.startNested = function (state) {
        var flags = this.stateSlot(state, 0 /* Flags */);
        return flags & 4 /* StartNest */ ? flags >> 10 /* NestShift */ : -1;
    };
    /// @internal
    Parser.prototype.validAction = function (state, action) {
        if (action == this.stateSlot(state, 4 /* DefaultReduce */))
            return true;
        for (var i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
            if (this.data[i] == 65535 /* End */) {
                if (this.data[i + 1] == 1 /* Next */)
                    i = pair(this.data, i + 2);
                else
                    return false;
            }
            if (action == pair(this.data, i + 1))
                return true;
        }
    };
    /// Get the states that can follow this one through shift actions or
    /// goto jumps. @internal
    Parser.prototype.nextStates = function (state) {
        var cached = this.nextStateCache[state];
        if (cached)
            return cached;
        var result = [];
        for (var i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
            if (this.data[i] == 65535 /* End */) {
                if (this.data[i + 1] == 1 /* Next */)
                    i = pair(this.data, i + 2);
                else
                    break;
            }
            if ((this.data[i + 2] & (65536 /* ReduceFlag */ >> 16)) == 0 && result.indexOf(this.data[i + 1]) < 0)
                result.push(this.data[i + 1]);
        }
        var table = this.goto, max = table[0];
        for (var term = 0; term < max; term++) {
            for (var pos = table[term + 1];;) {
                var groupTag = table[pos++], target = table[pos++];
                for (var end = pos + (groupTag >> 1); pos < end; pos++)
                    if (table[pos] == state && result.indexOf(target) < 0)
                        result.push(target);
                if (groupTag & 1)
                    break;
            }
        }
        return this.nextStateCache[state] = result;
    };
    /// @internal
    Parser.prototype.overrides = function (token, prev) {
        var iPrev = findOffset(this.data, this.tokenPrecTable, prev);
        return iPrev < 0 || findOffset(this.data, this.tokenPrecTable, token) < iPrev;
    };
    /// Create a new `Parser` instance with different values for (some
    /// of) the nested grammars. This can be used to, for example, swap
    /// in a different language for a nested grammar or fill in a nested
    /// grammar that was left blank by the original grammar.
    Parser.prototype.withNested = function (spec) {
        return this.copy({ nested: this.nested.map(function (obj) {
                if (!Object.prototype.hasOwnProperty.call(spec, obj.name))
                    return obj;
                return { name: obj.name, grammar: spec[obj.name], end: obj.end, placeholder: obj.placeholder };
            }) });
    };
    /// Create a new `Parser` instance whose node types have the given
    /// props added. You should use [`NodeProp.add`](#tree.NodeProp.add)
    /// to create the arguments to this method.
    Parser.prototype.withProps = function () {
        var _a;
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return this.copy({ group: (_a = this.group).extend.apply(_a, props) });
    };
    /// Replace the given external tokenizer with another one, returning
    /// a new parser object.
    Parser.prototype.withTokenizer = function (from, to) {
        return this.copy({ tokenizers: this.tokenizers.map(function (t) { return t == from ? to : t; }) });
    };
    Parser.prototype.copy = function (props) {
        // Hideous reflection-based kludge to make it easy to create a
        // slightly modified copy of a parser.
        var obj = Object.create(Parser.prototype);
        for (var _i = 0, _a = Object.keys(this); _i < _a.length; _i++) {
            var key = _a[_i];
            obj[key] = key in props ? props[key] : this[key];
        }
        return obj;
    };
    /// Returns the name associated with a given term. This will only
    /// work for all terms when the parser was generated with the
    /// `--names` option. By default, only the names of tagged terms are
    /// stored.
    Parser.prototype.getName = function (term) {
        return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.group.types[term].name || term);
    };
    Object.defineProperty(Parser.prototype, "eofTerm", {
        /// The eof term id is always allocated directly after the node
        /// types. @internal
        get: function () { return this.maxNode + 1; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Parser.prototype, "hasNested", {
        /// Tells you whether this grammar has any nested grammars.
        get: function () { return this.nested.length > 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Parser.prototype, "defaultTop", {
        /// @internal
        get: function () { return this.topRules[Object.keys(this.topRules)[0]]; },
        enumerable: true,
        configurable: true
    });
    /// @internal
    Parser.prototype.dynamicPrecedence = function (term) {
        var prec = this.dynamicPrecedences;
        return prec == null ? 0 : prec[term] || 0;
    };
    Object.defineProperty(Parser.prototype, "topType", {
        /// The node type produced by the default top rule.
        get: function () { return this.group.types[this.defaultTop[1]]; },
        enumerable: true,
        configurable: true
    });
    /// @internal
    Parser.prototype.parseDialect = function (dialect) {
        if (this.cachedDialect && this.cachedDialect.source == dialect)
            return this.cachedDialect;
        var values = Object.keys(this.dialects), flags = values.map(function () { return false; });
        if (dialect)
            for (var _i = 0, _a = dialect.split(" "); _i < _a.length; _i++) {
                var part = _a[_i];
                var id = values.indexOf(part);
                if (id >= 0)
                    flags[id] = true;
            }
        var disabled = null;
        for (var i = 0; i < values.length; i++)
            if (!flags[i]) {
                for (var j = this.dialects[values[i]], id = void 0; (id = this.data[j++]) != 65535 /* End */;)
                    (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id] = 1;
            }
        return this.cachedDialect = new Dialect(dialect, flags, disabled);
    };
    /// (used by the output of the parser generator) @internal
    Parser.deserialize = function (spec) {
        return new Parser(spec);
    };
    return Parser;
}());
function pair(data, off) { return data[off] | (data[off + 1] << 16); }
Parser.TokenGroup = TokenGroup;
var noProps = Object.create(null);
function findOffset(data, start, term) {
    for (var i = start, next = void 0; (next = data[i]) != 65535 /* End */; i++)
        if (next == term)
            return i - start;
    return -1;
}
function findFinished(stacks) {
    var best = null;
    for (var _i = 0, stacks_1 = stacks; _i < stacks_1.length; _i++) {
        var stack = stacks_1[_i];
        if (stack.pos == stack.cx.input.length &&
            stack.cx.parser.stateFlag(stack.state, 2 /* Accepting */) &&
            (!best || best.score < stack.score))
            best = stack;
    }
    return best;
}

// This file was generated by lezer-generator. You probably shouldn't edit it.
const 
  newlineBracketed = 7,
  newlineEmpty = 8,
  newline = 9,
  eof = 10,
  AssignOp = 5;

const newline$1 = 10, carriageReturn = 13, space = 32, tab = 9, hash = 35, parenOpen = 40, dot = 46;

const bracketed = [
  // ParenthesizedExpression, TupleExpression, ComprehensionExpression, ArrayExpression, ArrayComprehensionExpression,
  // DictionaryExpression, DictionaryComprehensionExpression, SetExpression, SetComprehensionExpression
],
  // parentStatement = [compoundStatement]
  parentStatement = [AssignOp];

const caches = new WeakMap;

// Per-input-stream indentation cache. `prev` maps indentation depths
// to the last position at which a statement indented to that depth
// was seen. There's an extra set of slots for the _current_
// indentation, since that needs to be available alongside a previous
// indentation position at the same level.
class Cache {
  constructor() {
    this.last = this.lastIndent = -1;
    this.prev = [];
  }

  get(pos) {
    if (this.last == pos) return this.lastIndent
    for (let i = 0; i < this.prev.length; i++) if (this.prev[i] == pos) return i
    return -1
  }

  set(pos, indent) {
    if (pos == this.last) return
    if (this.last > -1) this.setPrev(this.last, this.lastIndent);
    this.last = pos;
    this.lastIndent = indent;
  }

  setPrev(pos, indent) {
    while (this.prev.length < indent) this.prev.push(-1);
    this.prev[indent] = pos;
  }

  static for(input) {
    let found = caches.get(input);
    if (!found) caches.set(input, found = new Cache);
    return found
  }
}

const maxIndent = 50;

function getIndent(input, pos) {
  let cache = Cache.for(input), found = cache.get(pos);
  if (found > -1) return found

  // This shouldn't happen very often (or even at all) in normal
  // parsing, since the indentations are stored by the newline
  // tokenizer ahead of time. But it's kind of tricky to prove whether
  // that always happens in incremental parsing scenarios, so here's a
  // fallback anyway.
  let before = input.read(Math.max(0, pos - maxIndent), pos);
  let count = 0, start = before.length;
  for (; start > 0; start--) {
    let next = before.charCodeAt(start - 1);
    if (next == newline$1 || next == carriageReturn) break
  }
  for (let i = start; i < before.length; i++) {
    let ch = before.charCodeAt(i);
    if (ch == space) count++;
    else if (ch == tab) count += 8 - (count % 8);
    else break
  }
  cache.setPrev(pos, count);
  return count
}

const newlines = new ExternalTokenizer((input, token, stack) => {
  let next = input.get(token.start);
  if (next < 0) {
    token.accept(eof, token.start);
    return
  }
  if (next != newline$1 && next != carriageReturn) return
  if (stack.startOf(bracketed) != null) {
    token.accept(newlineBracketed, token.start + 1);
    return
  }
  let scan = token.start + 1, indent = 0;
  for (; scan < input.length; scan++) {
    let ch = input.get(scan);
    if (ch == space) indent++;
    else if (ch == tab) indent += 8 - (indent % 8);
    else if (ch == newline$1 || indent == carriageReturn || ch == hash) {
      token.accept(newlineEmpty, token.start + 1);
      return
    } else {
      break
    }
  }
  token.accept(newline, token.start + 1);
  Cache.for(input).set(scan, indent);
}, { contextual: true, fallback: true });

const bodyContinue = new ExternalTokenizer((input, token, stack) => {
  let parent = stack.startOf(parentStatement);
  let parentIndent = parent == null ? 0 : getIndent(input, parent);
  let indentHere = getIndent(input, token.start);
  token.accept(indentHere <= parentIndent ? endBody : continueBody, token.start);
}, { contextual: true, fallback: true });

const legacyPrint = new ExternalTokenizer((input, token) => {
  let pos = token.start;
  for (let print = "print", i = 0; i < print.length; i++, pos++)
    if (input.get(pos) != print.charCodeAt(i)) return
  let end = pos;
  if (/\w/.test(String.fromCharCode(input.get(pos)))) return
  for (; ; pos++) {
    let next = input.get(pos);
    if (next == space || next == tab) continue
    if (next != parenOpen && next != dot && next != newline$1 && next != carriageReturn && next != hash)
      token.accept(printKeyword, end);
    return
  }
});

// This file was generated by lezer-generator. You probably shouldn't edit it.
const parser = Parser.deserialize({
  version: 12,
  states: "!QO`QROOOOQQ'#C`'#C`OeQRO'#C_QOQROOOOQQ'#Ca'#CaO`QRO,58yOjQRO1G.eOOQQ7+$P7+$P",
  stateData: "r~O[OSWOSVOSPOS~O]PO~O^SO~OXVOYVO~O",
  goto: "cUPPPVY`RROQQORUTRTQ",
  nodeNames: "⚠ Comment Root Main VariableName2 AssignOp",
  maxTerm: 14,
  skippedNodes: [0,1],
  repeatNodeCount: 0,
  tokenData: "#_~RYXYq[]qpqqst!]!_!`!k!c!}!p#O#P#U#R#S!p#T#o!p$g~!p~vS[~XYq[]qpqq#O#P!S~!VQYZq]^q~!bRP~OY!]Z]!]^~!]~!pO^~~!uT]~!Q![!p!c!}!p#R#S!p#T#o!p$g~!p~#XQYZq]^q",
  tokenizers: [0, newlines],
  topRules: {"Root":[0,2]},
  tokenPrec: 0
});

export { parser as LezerParser, getEditorInfo };
