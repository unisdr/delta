import {describe, it} from 'node:test';

import assert from 'node:assert';
import {roleHasPermission} from './roles';

describe("roles", async () => {
	it("roleHasPermission", async () => {
		const fn = roleHasPermission
		assert.equal(fn("data-viewer", "ViewUsers"), false) 
		assert.equal(fn("data-viewer", "ViewData"), true) 
		assert.equal(fn("admin", "ViewUsers"), true) 
	})
})
