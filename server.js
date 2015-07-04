#!/bin/env node
//  Exemplo de aplicação em Node.js

/**
 *  Define os módulos necessários
 */
var express = require('express');
var nfs      = require('node-fs');
var request = require('request');
var path    = require('path');
var cheerio = require('cheerio');
var pkg     = require('./package.json');

/**
 *  Define a aplicação
 */
var NodeFetch = function() {

    //  Isola o escopo
    var self = this;


    /*  ================================================================  */
    /*  Funções auxiliares                                                */
    /*  ================================================================  */

    /**
     *  Configura o endereço de IP e porta do servior utilizando variáveis padrões do ambiente
     */
    self.setupVariables = function() {
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;
        
        if (typeof self.ipaddress === "undefined") {
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Cria um novo arquivo estatico
     *  @param {string} dirslug   Nome do diretorio
     *  @param {string} data      Dados do arquivo
     *  @param {bool} mkdir       Flag para criar diretorio
     */
     self.create_file = function(dirslug, data, mkdir) {
        if(mkdir === true) {
            try{
                nfs.mkdirSync(dirslug, 0755, true); 
            } catch(e) {
                console.log('ERROR:::: '+e);
            }
        }
        
        nfs.writeFileSync(dirslug+'/index.html', data, null, function(err) {
            if(err) {
                return console.log(err);
            }            
        });
     };


    /**
     *  Encerra o servidor quando receber o sinal
     *  @param {string} sig  Sinal enviado
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Configura sinais para encerramento o servidor
     */
    self.setupTerminationHandlers = function(){
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  Configuração do servidor express                                  */
    /*  ================================================================  */

    /**
     *  Cria a tabela de rotas pre-definidas
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/fetch'] = function(req, res) {
            var currentURL = (!req.query.q ? '' : req.query.q);
            var cat = (!req.query.cat ? 'web' : req.query.cat);
            var dirslug = (!req.query.dirslug ? 'emancipa' : req.query.dirslug);
            var dir = self.app.pub+'/'+cat+'/'+dirslug;
            var fetch = {page_title:'O Melhor da Web - Fetch',vlink:'Adicionar nova rota'};

            if(currentURL)
            request(currentURL, function (error, response, page) {
                if (!error && response.statusCode == 200) { 
                    var $ = cheerio.load(page);
                    $('body').find('a').each(function() {
                       $(this).attr('href', '/');
                    });
                    var bc = $('#bodyContent').html();
                    var single = {
                        page_title: $('title').text(),
                        page_url:   './'+path.join(cat,dirslug),
                        page_body: ($('#bodyContent').length ? bc : $('body').html() ),
                        first_heading: ($('#firstHeading').length ? $('#firstHeading').text() : $('body h1').first().text()),
                        excerpt: $('body p').first().text().substr(0,100)+'[...]'
                    };

                    res.render('single', single, function(err, html){
                        if (err) console.log( err );

                        if (!nfs.existsSync(dir)) {
                            self.create_file(dir, html, true);
                        } else {
                            self.create_file(dir, html, false);
                        }

                        fetch.vlink = 'Rota criada: <a href="'+cat+'/'+dirslug+'">Visualizar</a>';
                        res.render('fetch', fetch, function(err, html){
                            if (err) console.log( err );
                            res.send(html);
                        });
                    });

                }
            });
            else
                res.render('fetch', fetch, function(err, html){
                        if (err) console.log( err );
                        res.send(html);
                });
            
        };

        self.routes['/'] = function(req, res) {
            var catArray = [];
            var postArray = [];
            var items = nfs.readdirSync(self.app.pub);
            
            for (var i=0; i<items.length; i++) {  
                    if(/\./gi.test(items[i])) 
                        items.splice(i, 1);              

                    catArray.push(items[i]);                                                      
                    var items2 = nfs.readdirSync(self.app.pub+'/'+catArray[i]);

                    for (var j=0; j<items2.length; j++) {
                            var slug = catArray[i]+'/'+items2[j];                                
                            var file = nfs.readFileSync(self.app.pub+'/'+slug+'/index.html');
                            var $ = cheerio.load(file);
                            var excerpt = $('body p').first().text().substr(0,100)+'[...]';
                            postArray.push({'label':items2[j].replace(/\-/g,' '),'slug':slug,'excerpt':excerpt});
                    }
                
            } 

            
            var home = {page_title: 'O Melhor da Web', categories: catArray, recent_posts: postArray};
            res.render('home', home, function(err, html){
                if (err) console.log( err );
                res.send(html);
            });

        };

        self.routes['/:category/'] = function(req, res) {            
            var category = (req.params.category ? req.params.category : 'web');
            var postArray = [];
            var catSlug = self.app.pub+'/'+category;
            var catItems = nfs.readdirSync(catSlug);


            for (var j=0; j<catItems.length; j++) {
                var path = catSlug+'/'+catItems[j];                        
                var slug = category+'/'+catItems[j];
                var file = nfs.readFileSync(path+'/index.html');
                var $ = cheerio.load(file);
                var excerpt = $('body p').first().text().substr(0,100)+'[...]';
                postArray.push({'label':catItems[j].replace(/\-/g,' '),'slug':slug,'excerpt':excerpt});
            }                         
                            
            
            var archive = {page_title: 'O Melhor da Web', cat_label: category, recent_posts: postArray};
            res.render('archive', archive, function(err, html){
                if (err) console.log( err );
                res.send(html);
            });

        };
    };

    /**
     *  Configura o servidor e recupera as rotas de navegação
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        self.app.router = express.Router();

        // Configura o caminho para servir os arquivos públicos
        self.app.views = path.join(__dirname, 'views');
        self.app.pub = path.join(__dirname, 'public');
        self.app.assets = path.join(__dirname, 'assets');
        
        // Cria o diretório público
        if (!nfs.existsSync(self.app.pub))
            nfs.mkdirSync('public');

        // Configura o middleware
        self.app.use(express.static(self.app.pub));
        self.app.use('/assets/', express.static(self.app.assets));
        // Configura o template engine
        self.app.set('view engine','jade');
        self.app.set('views', self.app.views);
        self.app.locals.basedir = '/assets';


        // Define os eventos de cada rota
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }       
        
    };


    /**
     *  Inicializa a aplicação
     */
    self.initialize = function() {
        self.setupVariables();
        self.setupTerminationHandlers();
        self.initializeServer();
    };


    /**
     *  Inicializa o servidor
     */
    self.start = function() {
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('NodeFetch v'+pkg.version);
        });
    };

};


var NodeFetch = new NodeFetch();
NodeFetch.initialize();
NodeFetch.start();