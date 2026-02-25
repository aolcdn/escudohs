/**
 * FACEBOOK TRACKING GATEWAY - FINAL (Sales Page Edition)
 * - Atribuição otimizada (FBC dinâmico)
 * - Limpeza de URL nos payloads do painel
 * - Eventos Custom vs Standard automáticos
 * - Auto-Linker para Hotmart
 */
(function() {
    // --- 1. CONFIGURAÇÕES PRINCIPAIS ---
    const API_URL = 'https://tracking.lavishcreative.com';
    const FACEBOOK_PIXEL_ID = '915952520839958'; // SEU PIXEL PRINCIPAL AQUI
    const COOKIE_NAME = 'external_id';
    let cachedIp = null;

    // Lista oficial de eventos padrão do Facebook
    const STANDARD_EVENTS = [
        'AddPaymentInfo', 'AddToCart', 'AddToWishlist', 'CompleteRegistration', 'Contact', 
        'CustomizeProduct', 'Donate', 'FindLocation', 'InitiateCheckout', 'Lead', 
        'Purchase', 'Schedule', 'Search', 'StartTrial', 'SubmitApplication', 'Subscribe', 
        'ViewContent', 'PageView'
    ];

    // Limpa a URL de parâmetros de rastreamento para o payload da API
    function getCleanUrl() {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('sck');
            url.searchParams.delete('external_id');
            return url.origin + url.pathname;
        } catch (e) {
            return window.location.href.split('?')[0];
        }
    }

    // --- 2. IDENTIDADE DO USUÁRIO ---
    function getExternalId() {
        const p = new URLSearchParams(window.location.search);
        let id = p.get('sck') || p.get('external_id');
        if (id) {
            const d = new Date(); d.setTime(d.getTime() + (30*24*60*60*1000));
            document.cookie = `${COOKIE_NAME}=${id};expires=${d.toUTCString()};path=/;SameSite=Lax;Secure`;
            return id;
        }
        const m = document.cookie.match(new RegExp('(^| )'+COOKIE_NAME+'=([^;]+)'));
        return m ? m[2] : 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    const extId = getExternalId();
    window.trackingData = { external_id: extId };

    // --- 3. INICIALIZA O PIXEL NO NAVEGADOR ---
    if (!window.fbq) {
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
        fbq('init', FACEBOOK_PIXEL_ID, { external_id: extId });
    }

    function getFbc() {
        const p = new URLSearchParams(window.location.search);
        const f = p.get('fbclid');
        if(f) return `fb.1.${Date.now()}.${f}`;
        const m = document.cookie.match(/(^| )_fbc=([^;]+)/);
        return m ? m[2] : null;
    }

    // --- 4. FUNÇÃO DE DISPARO INTELIGENTE ---
    function send(n, ip, data={}) {
        const eid = `${n.toLowerCase()}_${extId}_${Date.now()}`;
        
        // A. Disparo no Navegador (Diferencia Padrão x Customizado)
        if (typeof fbq === 'function') {
            const method = STANDARD_EVENTS.includes(n) ? 'track' : 'trackCustom';
            fbq(method, n, data, { eventID: eid });
        }
        
        // B. Disparo na API (Servidor)
        const pl = {
            event_name: n, event_id: eid, external_id: extId, 
            url: getCleanUrl(), 
            fbp: (document.cookie.match(/(^| )_fbp=([^;]+)/)||[])[2], 
            fbc: getFbc(),
            target_pixel_id: FACEBOOK_PIXEL_ID
        };
        if(ip) pl.client_ip = ip;
        else if(cachedIp) pl.client_ip = cachedIp;

        fetch(`${API_URL}/track`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(pl), keepalive: true
        }).catch(console.error);
    }

    // Expondo a função para uso em botões e links
    window.trackEvent = function(n, data) { send(n, cachedIp, data); };

    // --- 5. EXECUÇÃO INICIAL (PAGEVIEW E VIEWCONTENT) ---
    fetch('https://api64.ipify.org?format=json')
        .then(r=>r.json()).then(d => { 
            cachedIp = d.ip; 
            send('PageView', d.ip); 
            send('ViewContent', d.ip);
        })
        .catch(() => {
            send('PageView', null);
            send('ViewContent', null);
        });

    // --- 6. AUTO-LINKER DA HOTMART ---
    function al() {
        setTimeout(()=>{
            document.querySelectorAll('a[href*="pay.hotmart.com"]').forEach(el=>{
                if(el.href.indexOf('sck=')<0) el.href += (el.href.includes('?')?'&':'?')+'sck='+extId;
            });
        }, 1200);
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', al); else al();
})();
