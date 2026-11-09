// mcp-server/tests/kanban-parser.test.js
import test from 'node:test';
import assert from 'node:assert';
import {
    parseKanbanXML,
    generateKanbanXML,
    addCard,
    moveCard,
    editCard,
    deleteCard,
    getBoardSummary
} from '../kanban-parser.js';

const sampleXML = `<kanban>
  <columns>
    <column id="col1" title="Aufgaben">
      <card-ref id="1" />
      <card-ref id="2" />
    </column>
    <column id="col2" title="In Bearbeitung">
      <card-ref id="3" />
    </column>
    <column id="col3" title="Erledigt">
      <card-ref id="4" />
    </column>
  </columns>
  <cards>
    <card id="1" color="" width="" height="">
      <text><![CDATA[Erste Aufgabe]]></text>
    </card>
    <card id="2" color="#ff0000" width="" height="">
      <text><![CDATA[Zweite Aufgabe]]></text>
    </card>
    <card id="3" color="" width="" height="">
      <text><![CDATA[Dritte Aufgabe in Arbeit]]></text>
    </card>
    <card id="4" color="" width="" height="">
      <text><![CDATA[Vierte Aufgabe erledigt]]></text>
    </card>
  </cards>
</kanban>`;

test('parseKanbanXML parses columns and cards correctly', () => {
    const state = parseKanbanXML(sampleXML);
    assert.strictEqual(state.columns.length, 3);
    assert.strictEqual(state.columns[0].cardIds.length, 2);
    assert.strictEqual(state.columns[0].cardIds[0], 1);
    assert.strictEqual(state.cards[1].text, 'Erste Aufgabe');
    assert.strictEqual(state.cards[2].color, '#ff0000');
});

test('addCard creates a new card and places it on top by default', () => {
    const state = parseKanbanXML(sampleXML);
    const result = addCard(state, { text: 'Fünfte Aufgabe', column: 'Aufgaben' });
    assert.strictEqual(result.id, 5);
    assert.strictEqual(state.columns[0].cardIds[0], 5);
    assert.strictEqual(state.cards[5].text, 'Fünfte Aufgabe');
});

test('moveCard moves card to target column', () => {
    const state = parseKanbanXML(sampleXML);
    const result = moveCard(state, { cardIdentifier: 1, targetColumn: 'Erledigt' });
    assert.strictEqual(result.fromColumn, 'Aufgaben');
    assert.strictEqual(result.toColumn, 'Erledigt');
    assert.strictEqual(state.columns[0].cardIds.includes(1), false);
    assert.strictEqual(state.columns[2].cardIds[0], 1);
});

test('moveCard by text substring search', () => {
    const state = parseKanbanXML(sampleXML);
    const result = moveCard(state, { cardIdentifier: 'Zweite', targetColumn: 'In Bearbeitung' });
    assert.strictEqual(result.card.id, 2);
    assert.strictEqual(result.toColumn, 'In Bearbeitung');
});

test('editCard modifies text and color', () => {
    const state = parseKanbanXML(sampleXML);
    const result = editCard(state, { cardIdentifier: 1, text: 'Erste Aufgabe (Aktualisiert)', color: '#00ff00' });
    assert.strictEqual(result.card.text, 'Erste Aufgabe (Aktualisiert)');
    assert.strictEqual(result.card.color, '#00ff00');
});

test('deleteCard removes card completely', () => {
    const state = parseKanbanXML(sampleXML);
    const result = deleteCard(state, { cardIdentifier: 2 });
    assert.strictEqual(result.deletedCard.id, 2);
    assert.strictEqual(state.cards[2], undefined);
    assert.strictEqual(state.columns[0].cardIds.includes(2), false);
});

test('roundtrip serialize generates valid XML', () => {
    const state = parseKanbanXML(sampleXML);
    addCard(state, { text: 'Test XML Generation' });
    const xml = generateKanbanXML(state);
    assert.ok(xml.includes('<kanban>'));
    assert.ok(xml.includes('Test XML Generation'));
    const reparsed = parseKanbanXML(xml);
    assert.strictEqual(reparsed.cards[5].text, 'Test XML Generation');
});
