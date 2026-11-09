#!/usr/bin/env node
// mcp-server/index.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { LerntoolboxClient } from './api-client.js';
import {
    parseKanbanXML,
    generateKanbanXML,
    addCard,
    moveCard,
    editCard,
    deleteCard,
    getBoardSummary
} from './kanban-parser.js';

const client = new LerntoolboxClient({
    baseUrl: process.env.LERNDTOOLBOX_URL || 'https://lerntoolbox.mrgoldsmitt.work',
    token: process.env.LERNDTOOLBOX_API_TOKEN
});

const server = new Server(
    {
        name: 'lerntoolbox-kanban',
        version: '1.0.0'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'kanban_list_boards',
                description: 'Listet alle vorhandenen Kanban-Boards des Benutzers in der Lerntoolbox auf.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: {
                            type: 'string',
                            description: 'Optionaler Suchfilter für den Board-Namen'
                        }
                    }
                }
            },
            {
                name: 'kanban_get_board',
                description: 'Lädt ein Kanban-Board und listet alle Spalten sowie die darin enthaltenen Aufgaben/Karten mit IDs und Details auf.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        }
                    },
                    required: ['board']
                }
            },
            {
                name: 'kanban_create_board',
                description: 'Erstellt ein neues Kanban-Board in der Lerntoolbox.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'Name des neuen Boards'
                        },
                        columns: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Optionale Liste von Spaltentiteln (Standard: ["Aufgaben", "In Bearbeitung", "Erledigt"])'
                        }
                    },
                    required: ['name']
                }
            },
            {
                name: 'kanban_add_card',
                description: 'Fügt eine neue Aufgabe/Karte zu einem Kanban-Board hinzu.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        },
                        text: {
                            type: 'string',
                            description: 'Inhalt/Beschreibung der Aufgabe'
                        },
                        column: {
                            type: 'string',
                            description: 'Zielspalte, z. B. "Aufgaben", "In Bearbeitung" oder "Erledigt" (Standard: "Aufgaben")'
                        },
                        color: {
                            type: 'string',
                            description: 'Optionale Hintergrundfarbe (z. B. "#ffecb3" oder Hexcode)'
                        },
                        position: {
                            type: 'string',
                            enum: ['top', 'bottom'],
                            description: 'Position in der Spalte (Standard: "top")'
                        }
                    },
                    required: ['board', 'text']
                }
            },
            {
                name: 'kanban_move_card',
                description: 'Verschiebt eine Aufgabe in eine andere Spalte (z. B. auf "Erledigt", "In Bearbeitung" oder "Aufgaben").',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        },
                        card: {
                            description: 'Karten-ID (Zahl) oder Text/Teiltext der Aufgabe',
                            type: ['string', 'number']
                        },
                        target_column: {
                            type: 'string',
                            description: 'Zielspalte (z. B. "Erledigt", "In Bearbeitung", "Aufgaben")'
                        },
                        position: {
                            type: 'string',
                            enum: ['top', 'bottom'],
                            description: 'Position in der Zielspalte (Standard: "top")'
                        }
                    },
                    required: ['board', 'card', 'target_column']
                }
            },
            {
                name: 'kanban_edit_card',
                description: 'Bearbeitet den Text oder die Farbe einer vorhandenen Aufgabe/Karte.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        },
                        card: {
                            description: 'Karten-ID (Zahl) oder Text/Teiltext der Aufgabe',
                            type: ['string', 'number']
                        },
                        text: {
                            type: 'string',
                            description: 'Neuer Text für die Aufgabe'
                        },
                        color: {
                            type: 'string',
                            description: 'Neue Farbe für die Aufgabe'
                        }
                    },
                    required: ['board', 'card']
                }
            },
            {
                name: 'kanban_delete_card',
                description: 'Löscht eine Aufgabe/Karte von einem Kanban-Board.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        },
                        card: {
                            description: 'Karten-ID (Zahl) oder Text/Teiltext der Aufgabe',
                            type: ['string', 'number']
                        }
                    },
                    required: ['board', 'card']
                }
            },
            {
                name: 'kanban_delete_board',
                description: 'Löscht ein gesamtes Kanban-Board aus der Lerntoolbox (erfordert Sicherheitsbestätigung confirm=true).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        board: {
                            type: 'string',
                            description: 'Name oder ID des Kanban-Boards'
                        },
                        confirm: {
                            type: 'boolean',
                            description: 'Muss explizit true sein, um versehentliches Löschen zu verhindern'
                        }
                    },
                    required: ['board', 'confirm']
                }
            }
        ]
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'kanban_list_boards': {
                const projects = await client.listKanbanProjects();
                const filter = (args?.filter || '').toLowerCase();
                const filtered = filter
                    ? projects.filter(p => p.project_name.toLowerCase().includes(filter))
                    : projects;

                const result = filtered.map(p => ({
                    id: p.id,
                    name: p.project_name,
                    updated_at: p.updated_at
                }));

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }

            case 'kanban_get_board': {
                const projectMeta = await client.resolveKanbanProject(args.board);
                const project = await client.getProject(projectMeta.id);

                let parsedData = {};
                try {
                    parsedData = JSON.parse(project.data_json);
                } catch (_) {}

                const state = parseKanbanXML(parsedData.xml || '');
                const summary = getBoardSummary(state);

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                id: projectMeta.id,
                                name: project.project_name,
                                updated_at: project.updated_at,
                                ...summary
                            }, null, 2)
                        }
                    ]
                };
            }

            case 'kanban_create_board': {
                const boardName = (args.name || '').trim();
                if (!boardName) throw new Error('Board-Name darf nicht leer sein.');

                const columnTitles = Array.isArray(args.columns) && args.columns.length > 0
                    ? args.columns
                    : ['Aufgaben', 'In Bearbeitung', 'Erledigt'];

                const state = {
                    columns: columnTitles.map((title, idx) => ({
                        id: `col${idx + 1}`,
                        title: title.trim(),
                        cardIds: []
                    })),
                    cards: {},
                    nextCardId: 1
                };

                const xml = generateKanbanXML(state);
                const dataJson = JSON.stringify({ xml });

                const res = await client.createProject(boardName, dataJson);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Kanban-Board "${boardName}" erfolgreich erstellt (ID: ${res.id}).`
                        }
                    ]
                };
            }

            case 'kanban_add_card': {
                const projectMeta = await client.resolveKanbanProject(args.board);
                const project = await client.getProject(projectMeta.id);

                const parsedData = JSON.parse(project.data_json || '{"xml":""}');
                const state = parseKanbanXML(parsedData.xml || '');

                const added = addCard(state, {
                    text: args.text,
                    column: args.column,
                    color: args.color,
                    position: args.position || 'top'
                });

                const newXml = generateKanbanXML(state);
                await client.updateProject(projectMeta.id, {
                    data_json: JSON.stringify({ xml: newXml })
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Aufgabe #${added.id} ("${added.text}") zum Board "${project.project_name}" in Spalte "${added.column}" hinzugefügt.`
                        }
                    ]
                };
            }

            case 'kanban_move_card': {
                const projectMeta = await client.resolveKanbanProject(args.board);
                const project = await client.getProject(projectMeta.id);

                const parsedData = JSON.parse(project.data_json || '{"xml":""}');
                const state = parseKanbanXML(parsedData.xml || '');

                const moved = moveCard(state, {
                    cardIdentifier: args.card,
                    targetColumn: args.target_column,
                    position: args.position || 'top'
                });

                const newXml = generateKanbanXML(state);
                await client.updateProject(projectMeta.id, {
                    data_json: JSON.stringify({ xml: newXml })
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Aufgabe #${moved.card.id} ("${moved.card.text}") von "${moved.fromColumn}" nach "${moved.toColumn}" verschoben.`
                        }
                    ]
                };
            }

            case 'kanban_edit_card': {
                const projectMeta = await client.resolveKanbanProject(args.board);
                const project = await client.getProject(projectMeta.id);

                const parsedData = JSON.parse(project.data_json || '{"xml":""}');
                const state = parseKanbanXML(parsedData.xml || '');

                const edited = editCard(state, {
                    cardIdentifier: args.card,
                    text: args.text,
                    color: args.color
                });

                const newXml = generateKanbanXML(state);
                await client.updateProject(projectMeta.id, {
                    data_json: JSON.stringify({ xml: newXml })
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `✅ Aufgabe #${edited.card.id} auf Board "${project.project_name}" aktualisiert:\n"${edited.card.text}"`
                        }
                    ]
                };
            }

            case 'kanban_delete_card': {
                const projectMeta = await client.resolveKanbanProject(args.board);
                const project = await client.getProject(projectMeta.id);

                const parsedData = JSON.parse(project.data_json || '{"xml":""}');
                const state = parseKanbanXML(parsedData.xml || '');

                const deleted = deleteCard(state, {
                    cardIdentifier: args.card
                });

                const newXml = generateKanbanXML(state);
                await client.updateProject(projectMeta.id, {
                    data_json: JSON.stringify({ xml: newXml })
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: `🗑️ Aufgabe #${deleted.deletedCard.id} ("${deleted.deletedCard.text}") wurde von Spalte "${deleted.fromColumn}" des Boards "${project.project_name}" gelöscht.`
                        }
                    ]
                };
            }

            case 'kanban_delete_board': {
                if (!args.confirm) {
                    throw new Error('Sicherheitsabbruch: confirm muss true sein, um das Board zu löschen.');
                }
                const projectMeta = await client.resolveKanbanProject(args.board);
                await client.deleteProject(projectMeta.id);

                return {
                    content: [
                        {
                            type: 'text',
                            text: `🗑️ Kanban-Board "${projectMeta.project_name}" (ID: ${projectMeta.id}) wurde dauerhaft gelöscht.`
                        }
                    ]
                };
            }

            default:
                throw new Error(`Unbekanntes Tool: ${name}`);
        }
    } catch (err) {
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `Fehler: ${err.message}`
                }
            ]
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Lerntoolbox Kanban MCP Server gestartet und verbunden.');
}

main().catch(err => {
    console.error('Fataler Fehler im MCP Server:', err);
    process.exit(1);
});
