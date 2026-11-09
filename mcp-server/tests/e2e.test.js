// mcp-server/tests/e2e.test.js
import test from 'node:test';
import assert from 'node:assert';
import { LerntoolboxClient } from '../api-client.js';
import {
    parseKanbanXML,
    generateKanbanXML,
    addCard,
    moveCard,
    editCard,
    deleteCard,
    getBoardSummary
} from '../kanban-parser.js';

const TOKEN = 'ltb_sec_6e79cde6cd8fb6941464c26a92d29a490fc321d9c33a6d18';
const client = new LerntoolboxClient({
    baseUrl: 'https://lerntoolbox.mrgoldsmitt.work',
    token: TOKEN
});

test('Live E2E: List boards, create test board, add card, move card, edit card, delete card, and delete board', async () => {
    // 1. List boards
    const boards = await client.listKanbanProjects();
    assert.ok(Array.isArray(boards), 'Boards should be an array');
    console.log(`Found ${boards.length} existing Kanban boards.`);

    // 2. Create a temporary test board
    const testBoardName = `__MCP_Test_${Date.now()}`;
    const initialXml = generateKanbanXML({
        columns: [
            { id: 'col1', title: 'Aufgaben', cardIds: [] },
            { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
            { id: 'col3', title: 'Erledigt', cardIds: [] }
        ],
        cards: {}
    });

    const createRes = await client.createProject(testBoardName, JSON.stringify({ xml: initialXml }));
    assert.ok(createRes.id, 'Created board must have an ID');
    const boardId = createRes.id;
    console.log(`Created test board: ${testBoardName} (${boardId})`);

    try {
        // 3. Resolve board
        const resolved = await client.resolveKanbanProject(testBoardName);
        assert.strictEqual(resolved.id, boardId);

        // 4. Fetch board data
        let project = await client.getProject(boardId);
        let state = parseKanbanXML(JSON.parse(project.data_json).xml);

        // 5. Add a card
        const added = addCard(state, { text: 'Testaufgabe via MCP', column: 'Aufgaben' });
        assert.strictEqual(added.id, 1);
        await client.updateProject(boardId, {
            data_json: JSON.stringify({ xml: generateKanbanXML(state) })
        });
        console.log('Added card #1 to "Aufgaben"');

        // 6. Verify card was saved
        project = await client.getProject(boardId);
        state = parseKanbanXML(JSON.parse(project.data_json).xml);
        assert.strictEqual(state.cards[1].text, 'Testaufgabe via MCP');

        // 7. Move card to "Erledigt"
        const moved = moveCard(state, { cardIdentifier: 1, targetColumn: 'Erledigt' });
        assert.strictEqual(moved.toColumn, 'Erledigt');
        await client.updateProject(boardId, {
            data_json: JSON.stringify({ xml: generateKanbanXML(state) })
        });
        console.log('Moved card #1 to "Erledigt"');

        // 8. Edit card
        const edited = editCard(state, { cardIdentifier: 1, text: 'Testaufgabe Aktualisiert' });
        assert.strictEqual(edited.card.text, 'Testaufgabe Aktualisiert');
        await client.updateProject(boardId, {
            data_json: JSON.stringify({ xml: generateKanbanXML(state) })
        });
        console.log('Edited card #1 text');

        // 9. Delete card
        const deleted = deleteCard(state, { cardIdentifier: 1 });
        assert.strictEqual(deleted.deletedCard.id, 1);
        await client.updateProject(boardId, {
            data_json: JSON.stringify({ xml: generateKanbanXML(state) })
        });
        console.log('Deleted card #1');

        // Verify card is gone
        project = await client.getProject(boardId);
        state = parseKanbanXML(JSON.parse(project.data_json).xml);
        assert.strictEqual(state.cards[1], undefined);

    } finally {
        // 10. Clean up test board
        await client.deleteProject(boardId);
        console.log(`Cleaned up test board ${boardId}.`);
    }
});
