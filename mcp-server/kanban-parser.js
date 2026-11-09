// mcp-server/kanban-parser.js

/**
 * Escapes characters for XML attribute values.
 */
export function escapeXML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Parses Kanban XML string into a structured JavaScript object.
 * Compatible with Lerntoolbox script.js parseKanbanXML().
 */
export function parseKanbanXML(xmlString) {
    const state = {
        columns: [],
        cards: {},
        nextCardId: 1
    };

    if (!xmlString || typeof xmlString !== 'string') {
        state.columns = [
            { id: 'col1', title: 'Aufgaben', cardIds: [] },
            { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
            { id: 'col3', title: 'Erledigt', cardIds: [] }
        ];
        return state;
    }

    // 1. Extract cards: <card id="..." color="..." width="..." height="..."> ... <text><![CDATA[...]]></text> ... </card>
    const cardRegex = /<card\s+([^>]*?)>([\s\S]*?)<\/card>/gi;
    let cardMatch;

    while ((cardMatch = cardRegex.exec(xmlString)) !== null) {
        const attrsStr = cardMatch[1];
        const bodyStr = cardMatch[2];

        const idMatch = attrsStr.match(/id=["'](\d+)["']/i);
        if (!idMatch) continue;
        const id = parseInt(idMatch[1], 10);

        const colorMatch = attrsStr.match(/color=["']([^"']*)["']/i);
        const widthMatch = attrsStr.match(/width=["']([^"']*)["']/i);
        const heightMatch = attrsStr.match(/height=["']([^"']*)["']/i);

        let text = '';
        const cdataMatch = bodyStr.match(/<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/i);
        if (cdataMatch) {
            text = cdataMatch[1];
        } else {
            const plainTextMatch = bodyStr.match(/<text>([\s\S]*?)<\/text>/i);
            if (plainTextMatch) {
                text = plainTextMatch[1];
            }
        }

        state.cards[id] = {
            id,
            text,
            color: colorMatch ? colorMatch[1] : '',
            width: widthMatch ? widthMatch[1] : '',
            height: heightMatch ? heightMatch[1] : ''
        };

        if (id >= state.nextCardId) {
            state.nextCardId = id + 1;
        }
    }

    // 2. Extract columns: <column id="..." title="..."> ... <card-ref id="..." /> ... </column>
    const colRegex = /<column\s+([^>]*?)>([\s\S]*?)<\/column>/gi;
    let colMatch;

    while ((colMatch = colRegex.exec(xmlString)) !== null) {
        const attrsStr = colMatch[1];
        const bodyStr = colMatch[2];

        const idMatch = attrsStr.match(/id=["']([^"']+)["']/i);
        const titleMatch = attrsStr.match(/title=["']([^"']*)["']/i);

        const colId = idMatch ? idMatch[1] : `col${state.columns.length + 1}`;
        let colTitle = titleMatch ? titleMatch[1] : 'Spalte';
        colTitle = unescapeXML(colTitle);

        const cardIds = [];
        const refRegex = /<card-ref\s+id=["'](\d+)["']\s*(?:\/>|><\/card-ref>)/gi;
        let refMatch;

        while ((refMatch = refRegex.exec(bodyStr)) !== null) {
            const cid = parseInt(refMatch[1], 10);
            cardIds.push(cid);
        }

        state.columns.push({
            id: colId,
            title: colTitle,
            cardIds
        });
    }

    if (state.columns.length === 0) {
        state.columns = [
            { id: 'col1', title: 'Aufgaben', cardIds: [] },
            { id: 'col2', title: 'In Bearbeitung', cardIds: [] },
            { id: 'col3', title: 'Erledigt', cardIds: [] }
        ];
    }

    return state;
}

function unescapeXML(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/**
 * Serializes state back to XML format identical to script.js generateKanbanXML().
 */
export function generateKanbanXML(state) {
    let xml = '<kanban>\n';
    xml += '  <columns>\n';

    state.columns.forEach(col => {
        xml += `    <column id="${escapeXML(col.id)}" title="${escapeXML(col.title)}">\n`;
        (col.cardIds || []).forEach(cid => {
            xml += `      <card-ref id="${cid}" />\n`;
        });
        xml += '    </column>\n';
    });
    xml += '  </columns>\n';

    xml += '  <cards>\n';
    Object.values(state.cards).forEach(card => {
        xml += `    <card id="${card.id}" color="${escapeXML(card.color || '')}" width="${escapeXML(card.width || '')}" height="${escapeXML(card.height || '')}">\n`;
        xml += `      <text><![CDATA[${card.text || ''}]]></text>\n`;
        xml += '    </card>\n';
    });
    xml += '  </cards>\n';
    xml += '</kanban>';

    return xml;
}

/**
 * Helper to find column by ID or name (case-insensitive fuzzy match).
 */
export function findColumn(state, columnIdentifier) {
    if (!columnIdentifier) return state.columns[0];
    const query = String(columnIdentifier).trim().toLowerCase();

    // Direct ID match
    let col = state.columns.find(c => c.id.toLowerCase() === query);
    if (col) return col;

    // Direct title match
    col = state.columns.find(c => c.title.toLowerCase() === query);
    if (col) return col;

    // Partial title match (e.g. "erledigt" matches "Erledigt")
    col = state.columns.find(c => c.title.toLowerCase().includes(query) || query.includes(c.title.toLowerCase()));
    if (col) return col;

    // Common synonyms
    if (query.includes('todo') || query.includes('aufgabe')) {
        col = state.columns.find(c => c.title.toLowerCase().includes('aufgabe') || c.id === 'col1');
        if (col) return col;
    }
    if (query.includes('progress') || query.includes('bearbeit') || query.includes('doing') || query.includes('arbeit')) {
        col = state.columns.find(c => c.title.toLowerCase().includes('bearbeitung') || c.id === 'col2');
        if (col) return col;
    }
    if (query.includes('done') || query.includes('fertig') || query.includes('erledigt')) {
        col = state.columns.find(c => c.title.toLowerCase().includes('erledigt') || c.id === 'col3');
        if (col) return col;
    }

    return state.columns[0];
}

/**
 * Helper to find card by numeric ID or substring in text.
 */
export function findCard(state, cardIdentifier) {
    if (cardIdentifier === null || cardIdentifier === undefined) return null;

    // Check if numeric ID
    const numId = parseInt(cardIdentifier, 10);
    if (!isNaN(numId) && state.cards[numId]) {
        return state.cards[numId];
    }

    // Substring match in card text
    const search = String(cardIdentifier).trim().toLowerCase();
    const matches = Object.values(state.cards).filter(c =>
        c.text.toLowerCase().includes(search)
    );

    if (matches.length > 0) {
        return matches[0];
    }

    return null;
}

/**
 * Adds a new card to state.
 */
export function addCard(state, { text, column, color = '', position = 'top' }) {
    if (!text || !text.trim()) {
        throw new Error('Text für die neue Aufgabe darf nicht leer sein.');
    }

    let maxId = 0;
    Object.keys(state.cards).forEach(k => {
        const id = parseInt(k, 10);
        if (id > maxId) maxId = id;
    });
    const newId = maxId + 1;

    const targetCol = findColumn(state, column);

    state.cards[newId] = {
        id: newId,
        text: text.trim(),
        color: color || '',
        width: '',
        height: ''
    };

    if (position === 'bottom') {
        targetCol.cardIds.push(newId);
    } else {
        targetCol.cardIds.unshift(newId);
    }

    return {
        id: newId,
        text: text.trim(),
        column: targetCol.title,
        columnId: targetCol.id
    };
}

/**
 * Moves a card from one column to another.
 */
export function moveCard(state, { cardIdentifier, targetColumn, position = 'top' }) {
    const card = findCard(state, cardIdentifier);
    if (!card) {
        throw new Error(`Karte "${cardIdentifier}" nicht gefunden.`);
    }

    const toCol = findColumn(state, targetColumn);
    let fromCol = null;

    // Remove from existing column
    state.columns.forEach(col => {
        const idx = col.cardIds.indexOf(card.id);
        if (idx !== -1) {
            fromCol = col;
            col.cardIds.splice(idx, 1);
        }
    });

    // Add to target column
    if (position === 'bottom') {
        toCol.cardIds.push(card.id);
    } else {
        toCol.cardIds.unshift(card.id);
    }

    return {
        card,
        fromColumn: fromCol ? fromCol.title : 'Unbekannt',
        toColumn: toCol.title
    };
}

/**
 * Edits an existing card's text or color.
 */
export function editCard(state, { cardIdentifier, text, color }) {
    const card = findCard(state, cardIdentifier);
    if (!card) {
        throw new Error(`Karte "${cardIdentifier}" nicht gefunden.`);
    }

    if (text !== undefined && text !== null) {
        card.text = text.trim();
    }
    if (color !== undefined && color !== null) {
        card.color = color;
    }

    // Find current column
    let columnTitle = 'Unbekannt';
    state.columns.forEach(col => {
        if (col.cardIds.includes(card.id)) {
            columnTitle = col.title;
        }
    });

    return {
        card,
        column: columnTitle
    };
}

/**
 * Deletes a card from state.
 */
export function deleteCard(state, { cardIdentifier }) {
    const card = findCard(state, cardIdentifier);
    if (!card) {
        throw new Error(`Karte "${cardIdentifier}" nicht gefunden.`);
    }

    let fromColTitle = 'Unbekannt';
    state.columns.forEach(col => {
        const idx = col.cardIds.indexOf(card.id);
        if (idx !== -1) {
            fromColTitle = col.title;
            col.cardIds.splice(idx, 1);
        }
    });

    delete state.cards[card.id];

    return {
        deletedCard: card,
        fromColumn: fromColTitle
    };
}

/**
 * Returns a human-friendly JSON representation of the board.
 */
export function getBoardSummary(state) {
    return {
        totalCards: Object.keys(state.cards).length,
        columns: state.columns.map(col => ({
            id: col.id,
            title: col.title,
            cardCount: col.cardIds.length,
            cards: col.cardIds.map(cid => state.cards[cid]).filter(Boolean)
        }))
    };
}
