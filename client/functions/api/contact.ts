interface Env {
    DISCORD_WEBHOOK_URL: string;
}

interface ContactRequest {
    name?: string;
    type: 'Bug' | 'Consiglio' | 'Altro';
    message: string;
}

// We use "any" for context to be absolutely sure it compiles in any TS environment
// Cloudflare Pages will pass the context object correctly regardless of the explicit type name
export const onRequestPost = async (context: any) => {
    const { request, env } = context;

    try {
        const body = await request.json() as ContactRequest;
        const { name, type, message } = body;

        if (!message) {
            return new Response(JSON.stringify({ error: 'Message is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const webhookUrl = env.DISCORD_WEBHOOK_URL;

        if (!webhookUrl) {
            console.error("Missing DISCORD_WEBHOOK_URL in environment");
            return new Response(JSON.stringify({
                error: 'Server configuration error: Missing Webhook URL',
                debug: "Ensure DISCORD_WEBHOOK_URL is set in Pages > Settings > Functions > Environment variables."
            }), {
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
            const errorText = await discordResponse.text();
            console.error("Discord API Error:", errorText);
            throw new Error(`Discord Webhook failed: ${discordResponse.status} ${errorText}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Contact Function Error:", err);
        return new Response(JSON.stringify({
            error: err.message || "Unknown error",
            debug: "Check Cloudflare Functions logs for details."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
