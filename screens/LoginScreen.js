import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';
import GlowingBackground from '../components/auth/GlowingBackground';
import StyledInput from '../components/auth/StyledInput';
import GradientButton from '../components/auth/GradientButton';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loginMutation = useMutation({
    mutationFn: () => login(email, password),
  });

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      return;
    }
    loginMutation.mutate();
  };

  const getErrorMessage = (error) => {
    if (error?.response?.status === 401) {
      return 'Correo o contraseña incorrectos';
    }
    if (error?.response?.status === 422) {
      return 'Por favor ingresa un correo válido';
    }
    if (error?.message === 'Network Error' || !error?.response) {
      return 'Error de conexión. Verifica tu internet';
    }
    return 'Ocurrió un error. Intenta de nuevo';
  };

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const contentTranslateY = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <GlowingBackground>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: logoAnim, transform: [{ scale: logoScale }] },
          ]}
        >
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Eventify</Text>
          <Text style={styles.subtitle}>Descubre el ritmo de tu ciudad</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] },
          ]}
        >
          {loginMutation.isError && (
            <Text style={styles.errorText}>{getErrorMessage(loginMutation.error)}</Text>
          )}

          <StyledInput
            icon={Mail}
            placeholder="Correo"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loginMutation.isPending}
          />

          <StyledInput
            icon={Lock}
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loginMutation.isPending}
          />

          <GradientButton
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loginMutation.isPending}
          />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <Text style={styles.signupText}>
            ¿No tienes una cuenta?{' '}
            <Text style={styles.signupLink} onPress={() => navigation.navigate('Register')}>
              Regístrate
            </Text>
          </Text>
        </Animated.View>
      </View>
    </GlowingBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 38,
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    color: colors.authError,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  forgotText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
  },
  signupText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 24,
    fontSize: 13,
  },
  signupLink: {
    color: '#BFA0FF',
    fontWeight: 'bold',
  },
});
