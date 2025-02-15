const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Configura la serialización y deserialización del usuario
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Aquí puedes recuperar el usuario de la base de datos usando el ID
  // En este caso, solo devolvemos el ID por simplicidad
  done(null, { id });
});

// Configura la estrategia de Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL, // Asegúrate de que esta URL esté configurada en la consola de Google
},
  (accessToken, refreshToken, profile, done) => {
    // Aquí se recibe el perfil del usuario de Google
    // Normalmente almacenarías el perfil en tu base de datos aquí
    return done(null, profile);
  }
));

module.exports = passport;
