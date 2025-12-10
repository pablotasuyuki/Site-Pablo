// Serviços de TI - Pablo Tasuyuki
// JavaScript para interatividade e funcionalidades

// ========================================
// MOBILE MENU
// ========================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('mobile-menu-enter');
        
        // Alterna ícone do menu
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            if (mobileMenu.classList.contains('hidden')) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            } else {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            }
        }
    });

    // Fecha o menu ao clicar em um link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    });
}

// ========================================
// SMOOTH SCROLL
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Ignora links vazios ou apenas "#"
        if (href === '#' || href === '') {
            return;
        }
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ========================================
// FUNÇÃO PARA SOLICITAR SERVIÇOS
// ========================================
function solicitarServico(nomeServico) {
    const telefone = '5551997395967';
    const mensagem = `Olá! Tenho interesse no serviço: ${nomeServico}`;
    const url = `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;
    
    // Abre em nova aba
    window.open(url, '_blank');
    
    // Analytics (opcional - pode ser removido se não usar)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'solicitar_servico', {
            'event_category': 'Serviços',
            'event_label': nomeServico
        });
    }
    
    // Feedback visual
    const button = event.target.closest('button');
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Abrindo WhatsApp...';
        button.classList.add('success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('success');
        }, 2000);
    }
}

// Torna a função global para ser acessível via onclick
window.solicitarServico = solicitarServico;

// ========================================
// HEADER SCROLL EFFECT
// ========================================
let lastScroll = 0;
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    // Adiciona sombra ao rolar
    if (currentScroll > 10) {
        header.classList.add('shadow-2xl');
    } else {
        header.classList.remove('shadow-2xl');
    }
    
    // Esconde/mostra header ao rolar (opcional)
    // Descomente se quiser ativar
    /*
    if (currentScroll > lastScroll && currentScroll > 100) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    */
    
    lastScroll = currentScroll;
});

// ========================================
// ANIMAÇÃO DE ENTRADA DOS CARDS
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'all 0.6s ease-out';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observa todos os cards de serviço
document.querySelectorAll('.service-card').forEach(card => {
    observer.observe(card);
});

// ========================================
// CONTADOR DE SERVIÇOS
// ========================================
function contarServicos() {
    const servicosExternos = document.querySelectorAll('#servicos-externos .service-card').length;
    const servicosInternos = document.querySelectorAll('#servicos-internos .service-card').length;
    const totalServicos = servicosExternos + servicosInternos;
    
    console.log(`📊 Total de serviços: ${totalServicos}`);
    console.log(`   - Externos: ${servicosExternos}`);
    console.log(`   - Internos: ${servicosInternos}`);
}

// Executa ao carregar a página
window.addEventListener('load', contarServicos);

// ========================================
// ANIMAÇÃO DE NÚMEROS (CONTADOR)
// ========================================
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ========================================
// LAZY LOADING DE IMAGENS
// ========================================
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
        }
    });
});

document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
});

// ========================================
// BOTÃO VOLTAR AO TOPO
// ========================================
function criarBotaoVoltarTopo() {
    const botao = document.createElement('button');
    botao.innerHTML = '<i class="fas fa-arrow-up"></i>';
    botao.className = 'fixed bottom-24 right-6 w-12 h-12 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-300 opacity-0 pointer-events-none z-40';
    botao.id = 'back-to-top';
    botao.setAttribute('aria-label', 'Voltar ao topo');
    
    botao.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    document.body.appendChild(botao);
    
    // Mostra/esconde o botão
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            botao.style.opacity = '1';
            botao.style.pointerEvents = 'auto';
        } else {
            botao.style.opacity = '0';
            botao.style.pointerEvents = 'none';
        }
    });
}

// Cria o botão ao carregar
window.addEventListener('load', criarBotaoVoltarTopo);

// ========================================
// TOOLTIP DINÂMICO
// ========================================
function inicializarTooltips() {
    const elementosComTooltip = document.querySelectorAll('[data-tooltip]');
    
    elementosComTooltip.forEach(elemento => {
        elemento.classList.add('tooltip');
    });
}

window.addEventListener('load', inicializarTooltips);

// ========================================
// COPIAR PARA ÁREA DE TRANSFERÊNCIA
// ========================================
function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(() => {
            mostrarNotificacao('Copiado para área de transferência!', 'success');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
        });
    } else {
        // Fallback para navegadores antigos
        const textArea = document.createElement('textarea');
        textArea.value = texto;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            mostrarNotificacao('Copiado para área de transferência!', 'success');
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
        document.body.removeChild(textArea);
    }
}

// ========================================
// SISTEMA DE NOTIFICAÇÕES
// ========================================
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `fixed top-24 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-300 translate-x-full`;
    
    const cores = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white',
        warning: 'bg-yellow-600 text-white'
    };
    
    const icones = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    notificacao.className += ` ${cores[tipo] || cores.info}`;
    notificacao.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${icones[tipo] || icones.info} text-xl"></i>
            <span class="font-semibold">${mensagem}</span>
        </div>
    `;
    
    document.body.appendChild(notificacao);
    
    // Anima entrada
    setTimeout(() => {
        notificacao.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove após 3 segundos
    setTimeout(() => {
        notificacao.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notificacao);
        }, 300);
    }, 3000);
}

window.mostrarNotificacao = mostrarNotificacao;

// ========================================
// FILTRO DE SERVIÇOS (BUSCA)
// ========================================
function criarBarraBusca() {
    const heroSection = document.querySelector('section.pt-32');
    if (!heroSection) return;
    
    const buscaContainer = document.createElement('div');
    buscaContainer.className = 'container mx-auto mt-8 max-w-2xl';
    buscaContainer.innerHTML = `
        <div class="relative">
            <input 
                type="text" 
                id="busca-servicos" 
                placeholder="Buscar serviços..." 
                class="w-full px-6 py-4 bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors duration-300"
            />
            <i class="fas fa-search absolute right-6 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
        </div>
    `;
    
    heroSection.appendChild(buscaContainer);
    
    // Funcionalidade de busca
    const inputBusca = document.getElementById('busca-servicos');
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.service-card');
            
            let resultadosEncontrados = 0;
            
            cards.forEach(card => {
                const titulo = card.querySelector('h3').textContent.toLowerCase();
                const descricao = card.querySelector('p').textContent.toLowerCase();
                
                if (titulo.includes(termo) || descricao.includes(termo)) {
                    card.style.display = 'block';
                    resultadosEncontrados++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Mostra mensagem se nenhum resultado for encontrado
            if (termo && resultadosEncontrados === 0) {
                mostrarNotificacao('Nenhum serviço encontrado', 'info');
            }
        });
    }
}

// Adiciona barra de busca ao carregar
window.addEventListener('load', criarBarraBusca);

// ========================================
// ESTATÍSTICAS E ANALYTICS
// ========================================
function rastrearClique(categoria, acao, rotulo) {
    console.log(`📊 Analytics: ${categoria} - ${acao} - ${rotulo}`);
    
    // Integração com Google Analytics (se disponível)
    if (typeof gtag !== 'undefined') {
        gtag('event', acao, {
            'event_category': categoria,
            'event_label': rotulo
        });
    }
}

// ========================================
// PREVENÇÃO DE CLIQUE DUPLO
// ========================================
let clickPrevenido = false;

document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        if (clickPrevenido) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        
        clickPrevenido = true;
        setTimeout(() => {
            clickPrevenido = false;
        }, 1000);
    }
});

// ========================================
// PERFORMANCE MONITORING
// ========================================
window.addEventListener('load', () => {
    if ('performance' in window) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log(`⚡ Tempo de carregamento: ${pageLoadTime}ms`);
    }
});

// ========================================
// SERVICE WORKER (PWA - Opcional)
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Descomente para ativar PWA
        /*
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker registrado:', registration);
            })
            .catch(error => {
                console.log('❌ Erro ao registrar Service Worker:', error);
            });
        */
    });
}

// ========================================
// TEMA ESCURO (já está escuro por padrão)
// ========================================
function alternarTema() {
    document.body.classList.toggle('light-mode');
    const tema = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('tema', tema);
}

// Carrega tema salvo
window.addEventListener('load', () => {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo === 'light') {
        document.body.classList.add('light-mode');
    }
});

// ========================================
// EASTER EGG
// ========================================
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        mostrarNotificacao('🐉 Dragão asiático ativado! 🎮', 'success');
        document.body.style.animation = 'float 2s ease-in-out infinite';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }
});

// ========================================
// LOG DE INICIALIZAÇÃO
// ========================================
console.log(`
╔════════════════════════════════════════╗
║  🐉 Site de Serviços de TI            ║
║  👨‍💻 Pablo Tasuyuki                      ║
║  ✅ JavaScript carregado com sucesso   ║
╚════════════════════════════════════════╝
`);

// ========================================
// FIM DO SCRIPT
// ========================================
