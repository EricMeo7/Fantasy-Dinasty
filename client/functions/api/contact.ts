
interface Env {
    DISCORD_WEBHOOK_URL: string;
}

interface ContactRequest {
    name?: string;
    type: 'Bug' | 'Consiglio' | 'Altro';
    message: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
    try {
        const { name, type, message } = await request.json<ContactRequest>();

        if (!message) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const webhookUrl = env.DISCORD_WEBHOOK_URL;

        if (!webhookUrl) {
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Determine color based on type
        let color = 3447003; // Default Blue
        if (type === 'Bug') color = 15158332; // Red
        if (type === 'Consiglio') color = 3066993; // Green

        const payload = {
            username: "FantasyBasket Contact Bot",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
            embeds: [
                {
                    title: `Nuova Segnalazione: ${type}`,
                    color: color,
                    fields: [
                        {
                            name: "Da",
                            value: name || "Anonimo",
                            inline: true
                        },
                        {
                            name: "Tipo",
                            value: type,
                            inline: true
                        },
                        {
                            name: "Messaggio",
                            value: message
                        }
                    ],
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: "Inviato da FantasyBasket Web"
                    }
                }
            ]
        };

        const discordResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!discordResponse.ok) {
            throw new Error('Discord Webhook failed');
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
