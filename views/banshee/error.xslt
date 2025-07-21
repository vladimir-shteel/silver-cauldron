<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="main.xslt" />

<xsl:template match="content">
<h1>Critical miss</h1>
<img src="/images/fail.png" alt="error" class="error" />
<p><xsl:apply-templates select="website_error" /></p>
<p>If you do not agree on this outcome, contact the <a href="mailto:{webmaster_email}">webmaster</a>.</p>
<p>Click <a href="/">here</a> to return to the homepage.</p>
</xsl:template>

</xsl:stylesheet>
