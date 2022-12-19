// First select the first row
const beginId = 329;
const endId = 332; // exclude
function getResource(id) {
	const rowId = `Direct Planning Tree_x-auto-` + id;
	return document.getElementById(rowId);
}
function expendResource(resource) {
	if (resource.getAttribute('aria-expanded') === 'true')
		return false;
	/**
	 * @type {HTMLImageElement}
	 */
	const button = resource.querySelector('img.x-tree3-node-joint');
	if (!button || button.src.includes('/clear.gif'))
		return false;
	button.click();
	return true;
}
function getAllResources() {
	// Get all rows between beginId and endId
	const rows = Array.from(document.querySelectorAll('.x-grid3-row'));
	var resources = [];
	const begin = getResource(beginId);
	const end = getResource(endId);
	const beginIndex = rows.indexOf(begin);
	const endIndex = rows.indexOf(end);
	if (beginIndex < 0 || endIndex < 0) {
		console.log('Invalid beginId or endId (not found)', { begin, end });
		return [];
	}
	for (var i = beginIndex; i < endIndex; i++) {
		const row = rows[i];
		resources.push(row);

		if (!row.rowId) {
			var id = row.getAttribute('id');
			id = id.split('_x-auto-')[1];
			row.rowId = parseInt(id);
		}
		if (!row.ariaLabel) {
			row.ariaLabel = row.querySelector('span.x-tree3-node-text')?.textContent;
		}
	}
	return resources;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Expend all rows between beginId and endId
var lastExpanded = [];
async function expandAll(i = 0) {
	expendResource(getResource(245)); // Etu
	await sleep(100);
	expendResource(getResource(299)); // Pol
	await sleep(100);
	if (i > 600) return; // 1 minute
	const rows = getAllResources();
	lastExpanded = rows.filter(expendResource);
	if (lastExpanded.length > 0)
		setTimeout(() => expandAll(i + 1), 100);
}
await expandAll();



function getAllResourcesData() {
	const rows = getAllResources();
	return rows.map(row => ({ name: row.getAttribute('aria-label'), id: row.rowId, row }));
}
var resources = getAllResourcesData();
console.log(resources.map(r => `"${r.name}": ${r.id},`).join('\n'));



class ResourceNode {
	name = "";
	id = 0;
	/** @type {HTMLDivElement} */
	row = null;
	/** @type {ResourceNode[]} */
	childs = [];
	/** @type {ResourceNode} */
	parent = null;
	level = 0;
	constructor(row) {
		this.name = row.getAttribute('aria-label');
		this.id = row.rowId;
		this.row = row;
		this.level = parseInt(row.getAttribute('aria-level'));
	}
}

function getTreeResourcesData() {
	const rows = getAllResources();
	/** @type {ResourceNode} */
	var resourceTree = null;
	var parentNode = resourceTree;
	var previousNode = parentNode;
	for (const row of rows) {
		const node = new ResourceNode(row);
		if (parentNode && previousNode) {
			if (node.level > previousNode.level) {
				parentNode = previousNode;
			} else if (node.level < previousNode.level) {
				while (parentNode && node.level <= parentNode.level) {
					parentNode = parentNode.parent;
				}
			}
		}
		node.parent = parentNode;
		parentNode?.childs.push(node);
		previousNode = node;
		if (!parentNode) {
			parentNode = node;
			resourceTree = node;
		}
	}
	return resourceTree;
}