var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var util = require('util');
var session = require('express-session');
var passport = require('passport');

module.exports = (app, url, appEnv, User) => {

    app.use(session({
        secret: process.env.SESSION_SECRET,
        name: 'freelancalot',
        proxy: true,
        resave: true,
        saveUninitialized: true
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser(function(user, done) {
        var id = user.get('id');
        console.log('serializeUser: ' + id)
        done(null, id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id).then(function(user) {
            done(null, user);
        })
    });

    var googleOAuth = appEnv.getService('googleOAuth'),
        googleOAuthCreds = googleOAuth.credentials;

    passport.use(new GoogleStrategy({
            clientID: googleOAuthCreds.clientID,
            clientSecret: googleOAuthCreds.clientSecret,
            callbackURL: util.format("http://%s%s", url, googleOAuthCreds.callbackPath)
        },
        function(token, refreshToken, profile, done) {
            process.nextTick(function() {
                User.findOrCreate({
                        where: {
                            googleId: profile.id
                        },
                        defaults: {
                            name: profile.displayName,
                            email: profile.emails[0].value
                        }
                    })
                    .spread(function(user, created) {
                        done(null, user);
                    })
            });
        }));

    app.get('/auth/google', passport.authenticate('google', {
        scope: ['profile', 'email']
    }));

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect: '/',
            failureRedirect: '/login'
        }));

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/login');
    });
}